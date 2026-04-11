import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { GPX_BUCKET } from "@/lib/s3";
import { readFileContent } from "@/lib/storage";
import { parseGpxXml } from "@/lib/gpx/parser";
import { parseVccXml } from "@/lib/velocitek/vcc-parser";
import { parseVelocitkCsv } from "@/lib/velocitek/parser";
import { validateGpxTrackEnhanced, validateOutAndBackGpxTrack } from "@/lib/gpx/validator";
import { validateGpxTrackForLines } from "@/lib/gpx/line-validator";
import { computeSog, computeAvgMaxSog } from "@/lib/gpx/sog";
import type { RigSize } from "@prisma/client";
import type { ParsedGpx } from "@/lib/gpx/parser";
import type { VccParseResult } from "@/lib/velocitek/vcc-parser";
import type { VeloctekParseResult } from "@/lib/velocitek/parser";

// Convert different parser results to ParsedGpx format
function normalizeToParseGpx(parsed: ParsedGpx | VccParseResult | VeloctekParseResult): ParsedGpx {
  if ('durationSec' in parsed) {
    // Already ParsedGpx
    return parsed;
  }

  // For VCC and Veloctek results, calculate duration from points
  const timedPoints = parsed.points.filter((p) => p.time !== null);
  const startTime = timedPoints.length > 0 ? timedPoints[0].time : null;
  const endTime = timedPoints.length > 0 ? timedPoints[timedPoints.length - 1].time : null;

  let durationSec: number | null = null;
  if (startTime && endTime) {
    durationSec = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  }

  return {
    points: parsed.points,
    startTime,
    endTime,
    durationSec
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    console.log('❌ FKT Submission: Unauthorized access attempt');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    courseId,
    rigSize,
    date,
    gpxS3Key,
    windSpeedKnots,
    windDirection,
    currentNotes,
    writeUp,
    trackSourceUrl,
    sailorName,
    sailorEmail,
  } = body;

  console.log('🏁 FKT Submission started:', {
    userId: session.user.id,
    userEmail: session.user.email,
    courseId,
    rigSize,
    gpxS3Key,
    sailorName,
    sailorEmail
  });

  if (!courseId || !rigSize || !date || !gpxS3Key) {
    const missingFields = [];
    if (!courseId) missingFields.push('courseId');
    if (!rigSize) missingFields.push('rigSize');
    if (!date) missingFields.push('date');
    if (!gpxS3Key) missingFields.push('gpxS3Key');

    console.log('❌ FKT Submission: Missing required fields:', missingFields);
    return NextResponse.json({
      error: `Missing required fields: ${missingFields.join(', ')}`
    }, { status: 400 });
  }

  // Validate rig size
  const validRigSizes: RigSize[] = ["AERO_5", "AERO_6", "AERO_7", "AERO_9"];
  if (!validRigSizes.includes(rigSize)) {
    console.log('❌ FKT Submission: Invalid rig size:', rigSize);
    return NextResponse.json({
      error: `Invalid rig size: ${rigSize}. Valid options: ${validRigSizes.join(', ')}`
    }, { status: 400 });
  }

  // Fetch course (allow both pending and approved courses)
  console.log('🔍 Fetching course:', courseId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
  });
  if (!course || (course.status !== "PENDING" && course.status !== "APPROVED")) {
    console.log('❌ FKT Submission: Route not found or invalid status:', courseId, course?.status);
    return NextResponse.json({
      error: "Route not found or not available for FKT submissions"
    }, { status: 404 });
  }
  console.log('✅ Route found:', { id: course.id, name: course.name, status: course.status });

  // Fetch GPX from S3 (or local filesystem in dev)
  console.log('📁 Fetching GPX file:', { bucket: GPX_BUCKET, key: gpxS3Key });
  let gpxXml: string;
  try {
    gpxXml = await readFileContent(GPX_BUCKET, gpxS3Key);
    console.log('✅ GPX file fetched successfully:', { size: gpxXml.length });
  } catch (error) {
    const errorMsg = "Failed to fetch your uploaded GPX file. The file may be corrupted or not properly uploaded.";
    console.log('❌ FKT Submission: Failed to fetch GPX file:', {
      bucket: GPX_BUCKET,
      key: gpxS3Key,
      error: error instanceof Error ? error.message : String(error)
    });

    // Save failed attempt for admin tracking
    try {
      await prisma.fktAttempt.create({
        data: {
          courseId,
          athleteId: session.user.id,
          rigSize: rigSize as RigSize,
          date: new Date(date),
          durationSec: 0,
          gpxS3Key,
          gpxValidated: false,
          writeUp: `GPX fetch failed: ${error instanceof Error ? error.message : String(error)}`,
          sailorName: sailorName || null,
          sailorEmail: sailorEmail || null,
          status: "REJECTED",
        },
      });
    } catch (dbError) {
      console.log('⚠️ Failed to save rejected attempt:', dbError);
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }

  // Parse track file (GPX, VCC, or CSV)
  console.log('🔍 Parsing track file...');
  // Detect file format and parse accordingly
  const fileExtension = gpxS3Key.split('.').pop()?.toLowerCase();
  let parsed;
  try {
    console.log('📁 Detected file extension:', fileExtension);

    if (fileExtension === 'vcc') {
      console.log('🔧 Parsing as VCC file...');
      parsed = parseVccXml(gpxXml);
    } else if (fileExtension === 'csv') {
      console.log('🔧 Parsing as CSV file...');
      parsed = parseVelocitkCsv(gpxXml);
    } else {
      console.log('🔧 Parsing as GPX file...');
      parsed = parseGpxXml(gpxXml);
    }

    console.log('✅ Track file parsed successfully:', {
      pointCount: parsed.points.length,
      startTime: 'startTime' in parsed ? parsed.startTime : 'N/A',
      endTime: 'endTime' in parsed ? parsed.endTime : 'N/A',
      format: fileExtension
    });
  } catch (error) {
    const errorMsg = "Invalid track file format. Please ensure your file is a valid GPX, VCC, or CSV track file.";
    console.log('❌ FKT Submission: Failed to parse track file:', {
      fileExtension,
      error: error instanceof Error ? error.message : String(error)
    });

    // Save failed attempt for admin tracking
    try {
      await prisma.fktAttempt.create({
        data: {
          courseId,
          athleteId: session.user.id,
          rigSize: rigSize as RigSize,
          date: new Date(date),
          durationSec: 0,
          gpxS3Key,
          gpxValidated: false,
          writeUp: `Track file parse failed: ${error instanceof Error ? error.message : String(error)}`,
          sailorName: sailorName || null,
          sailorEmail: sailorEmail || null,
          status: "REJECTED",
        },
      });
    } catch (dbError) {
      console.log('⚠️ Failed to save rejected attempt:', dbError);
    }

    return NextResponse.json({ error: errorMsg }, { status: 422 });
  }

  console.log('🔍 Validating GPX track against course...');
  const normalizedParsed = normalizeToParseGpx(parsed);

  let validation;
  if (course.courseType === "OUT_AND_BACK") {
    if (!course.turningMarkLat || !course.turningMarkLng) {
      console.log('❌ FKT Submission: Out-and-back course missing turning mark coordinates');
      return NextResponse.json({
        error: "This out-and-back course is missing turning mark coordinates. Please contact an administrator."
      }, { status: 500 });
    }

    // Use existing validation for out-and-back courses (not yet updated for lines)
    validation = validateOutAndBackGpxTrack(
      normalizedParsed,
      course.startLat,
      course.startLng,
      course.turningMarkLat,
      course.turningMarkLng
    );
  } else {
    // For ONE_WAY courses, use enhanced validation that supports both points and lines
    // Default to 'POINT' type for existing courses that don't have type fields set
    const startType = course.startType || 'POINT';
    const finishType = course.finishType || 'POINT';

    // Use line intersection validation for line-to-line courses
    if (startType === 'LINE' && finishType === 'LINE' &&
        course.startLine2Lat && course.startLine2Lng &&
        course.finishLine2Lat && course.finishLine2Lng) {

      console.log("🔍 Using LINE INTERSECTION validation for line-to-line course");
      validation = validateGpxTrackForLines(
        normalizedParsed,
        { lat: course.startLat, lng: course.startLng },
        { lat: course.startLine2Lat, lng: course.startLine2Lng },
        { lat: course.finishLat, lng: course.finishLng },
        { lat: course.finishLine2Lat, lng: course.finishLine2Lng }
      );
    } else {
      // Use proximity-based validation for point/line mixed courses
      console.log("🔍 Using PROXIMITY validation for point/mixed course");
      validation = validateGpxTrackEnhanced(
        normalizedParsed,
        startType,
        course.startLat,
        course.startLng,
        finishType,
        course.finishLat,
        course.finishLng,
        course.startLine2Lat || undefined,
        course.startLine2Lng || undefined,
        course.finishLine2Lat || undefined,
        course.finishLine2Lng || undefined
      );
    }
  }

  if (!validation.valid) {
    const logData: Record<string, unknown> = {
      error: validation.error,
      courseName: course.name,
      courseType: course.courseType
    };

    // Add distance fields if they exist (for proximity-based validation)
    if ('nearestStartDistanceM' in validation) {
      logData.nearestStartDistanceM = validation.nearestStartDistanceM;
      logData.nearestFinishDistanceM = validation.nearestFinishDistanceM;
      logData.nearestTurningMarkDistanceM = validation.nearestTurningMarkDistanceM;
    }

    // Add timing details if they exist (for line-based validation)
    if ('timingDetails' in validation && validation.timingDetails) {
      logData.timingDetails = validation.timingDetails;
    }

    console.log('❌ FKT Submission: GPX validation failed:', logData);

    let detailedError = validation.error;

    // Only add distance details for proximity-based validation (not line intersection validation)
    if ('nearestStartDistanceM' in validation) {
      if (course.courseType === "OUT_AND_BACK") {
        if (validation.nearestStartDistanceM !== undefined) {
          detailedError = `${validation.error} Your track came within ${validation.nearestStartDistanceM.toFixed(1)}m of the start/finish point.`;
        }
        if (validation.nearestTurningMarkDistanceM !== undefined) {
          detailedError += ` Your track came within ${validation.nearestTurningMarkDistanceM.toFixed(1)}m of the turning mark.`;
        }
      } else {
        // Handle both point and line distance reporting for ONE_WAY courses
        const startType = course.startType || 'POINT';
        const finishType = course.finishType || 'POINT';

        if (startType === 'POINT' && validation.nearestStartDistanceM !== undefined) {
          detailedError = `${validation.error} Your track came within ${validation.nearestStartDistanceM.toFixed(1)}m of the start point.`;
        } else if (startType === 'LINE' && 'nearestStartLineDistanceM' in validation && validation.nearestStartLineDistanceM !== undefined) {
          detailedError = `${validation.error} Your track came within ${validation.nearestStartLineDistanceM.toFixed(1)}m of the start line.`;
        }

        if (finishType === 'POINT' && validation.nearestFinishDistanceM !== undefined) {
          detailedError += ` Your track came within ${validation.nearestFinishDistanceM.toFixed(1)}m of the finish point.`;
        } else if (finishType === 'LINE' && 'nearestFinishLineDistanceM' in validation && validation.nearestFinishLineDistanceM !== undefined) {
          detailedError += ` Your track came within ${validation.nearestFinishLineDistanceM.toFixed(1)}m of the finish line.`;
        }

        if ((startType === 'POINT' || finishType === 'POINT')) {
          detailedError += ` Tracks must pass within 10m of all points.`;
        }
      }
    }

    // Save failed attempt for admin tracking
    try {
      await prisma.fktAttempt.create({
        data: {
          courseId,
          athleteId: session.user.id,
          rigSize: rigSize as RigSize,
          date: new Date(date),
          durationSec: 0, // No valid duration for failed attempt
          gpxS3Key,
          gpxValidated: false,
          avgSogKnots: null,
          maxSogKnots: null,
          windSpeedKnots: windSpeedKnots ? parseFloat(windSpeedKnots) : null,
          windDirection: windDirection || null,
          currentNotes: currentNotes || null,
          writeUp: detailedError, // Store failure reason in writeUp field
          trackSourceUrl: trackSourceUrl || null,
          sailorName: sailorName || null,
          sailorEmail: sailorEmail || null,
          status: "REJECTED",
        },
      });
      console.log('📝 Failed attempt saved for admin tracking');
    } catch (dbError) {
      console.log('⚠️ Failed to save rejected attempt to database:', dbError);
      // Don't fail the response if we can't save the tracking record
    }

    const errorResponse: Record<string, unknown> = {
      error: detailedError,
    };

    // Add distance information only for proximity-based validation
    if ('nearestStartDistanceM' in validation) {
      errorResponse.nearestStartDistanceM = validation.nearestStartDistanceM;
      errorResponse.nearestFinishDistanceM = validation.nearestFinishDistanceM;

      // Add line distance information for enhanced validation
      if ('nearestStartLineDistanceM' in validation && validation.nearestStartLineDistanceM !== undefined) {
        errorResponse.nearestStartLineDistanceM = validation.nearestStartLineDistanceM;
      }
      if ('nearestFinishLineDistanceM' in validation && validation.nearestFinishLineDistanceM !== undefined) {
        errorResponse.nearestFinishLineDistanceM = validation.nearestFinishLineDistanceM;
      }

      if (course.courseType === "OUT_AND_BACK" && validation.nearestTurningMarkDistanceM !== undefined) {
        errorResponse.nearestTurningMarkDistanceM = validation.nearestTurningMarkDistanceM;
      }
    }

    // Add timing information for line-based validation
    if ('timingDetails' in validation && validation.timingDetails) {
      errorResponse.timingDetails = validation.timingDetails;
    }

    return NextResponse.json(errorResponse, { status: 422 });
  }

  // Compute SOG only over the race segment (start entry → end entry),
  // excluding pre-race sailing to the start and post-race sailing after the end.
  console.log('📊 Computing SOG statistics...');
  const sogPoints = computeSog(validation.racePoints!);
  const { avgSogKnots, maxSogKnots } = computeAvgMaxSog(sogPoints);
  console.log('✅ SOG computed:', { avgSogKnots, maxSogKnots });

  // Save attempt
  console.log('💾 Saving FKT attempt...');

  // Set FKT status based on course status
  const attemptStatus = course.status === "APPROVED" ? "APPROVED" : "PENDING";
  console.log('📋 FKT status will be:', attemptStatus, 'based on course status:', course.status);

  try {
    // Extract race timing indices from line validator if available
    let raceStartIndex: number | undefined;
    let raceEndIndex: number | undefined;

    if ('timingDetails' in validation && validation.timingDetails) {
      raceStartIndex = validation.timingDetails.lastStartCrossingIndex;
      raceEndIndex = validation.timingDetails.firstFinishCrossingIndex;

      console.log('🎯 Race timing indices detected:', {
        raceStartIndex,
        raceEndIndex,
        startCrossings: validation.timingDetails.startLineCrossings,
        finishCrossings: validation.timingDetails.finishLineCrossings
      });
    }

    const attempt = await prisma.fktAttempt.create({
      data: {
        courseId,
        athleteId: session.user.id,
        rigSize: rigSize as RigSize,
        date: new Date(date),
        durationSec: validation.durationSec!,
        gpxS3Key,
        gpxValidated: true,
        avgSogKnots,
        maxSogKnots,
        windSpeedKnots: windSpeedKnots ? parseFloat(windSpeedKnots) : null,
        windDirection: windDirection || null,
        currentNotes: currentNotes || null,
        writeUp: writeUp || null,
        trackSourceUrl: trackSourceUrl || null,
        sailorName: sailorName || null,
        sailorEmail: sailorEmail || null,
        status: attemptStatus,
        raceStartIndex,
        raceEndIndex,
      },
    });

    console.log('🎉 FKT Submission successful:', {
      attemptId: attempt.id,
      courseName: course.name,
      durationSec: validation.durationSec,
      sailorName: sailorName,
      status: attemptStatus
    });

    return NextResponse.json(attempt, { status: 201 });
  } catch (error) {
    console.log('❌ FKT Submission: Database save failed:', {
      error: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json({
      error: "Failed to save FKT attempt. Please try again."
    }, { status: 500 });
  }
}
