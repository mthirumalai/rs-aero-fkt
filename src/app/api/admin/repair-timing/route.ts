import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFileContent } from "@/lib/storage";
import { GPX_BUCKET } from "@/lib/s3";
import { parseGpxXml, ParsedGpx, GpxPoint } from "@/lib/gpx/parser";
import { parseVccXml, VccParseResult } from "@/lib/velocitek/vcc-parser";
import { parseVelocitkCsv, VeloctekParseResult } from "@/lib/velocitek/parser";
import { validateGpxTrackForLines } from "@/lib/gpx/line-validator";

// Convert different parser results to ParsedGpx format
function normalizeToParseGpx(parsed: ParsedGpx | VccParseResult | VeloctekParseResult): ParsedGpx {
  if ('durationSec' in parsed) {
    return parsed;
  }

  const timedPoints = parsed.points.filter((p: GpxPoint) => p.time !== null);
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
  try {
    const { attemptId } = await req.json();

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    console.log('🔧 Repairing timing for attempt:', attemptId);

    // Get the attempt
    const attempt = await prisma.fktAttempt.findUnique({
      where: { id: attemptId },
      include: { course: true }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Only repair line-to-line courses
    if (attempt.course.startType !== 'LINE' || attempt.course.finishType !== 'LINE') {
      return NextResponse.json({
        error: "Only line-to-line courses need timing repair"
      }, { status: 400 });
    }

    // Check if already has timing data
    if (attempt.raceStartIndex !== null && attempt.raceEndIndex !== null) {
      return NextResponse.json({
        message: "Attempt already has timing data",
        raceStartIndex: attempt.raceStartIndex,
        raceEndIndex: attempt.raceEndIndex
      });
    }

    console.log('📁 Fetching GPX file:', attempt.gpxS3Key);

    // Fetch GPX from storage
    let gpxXml: string;
    try {
      gpxXml = await readFileContent(GPX_BUCKET, attempt.gpxS3Key);
    } catch (error) {
      console.error('Failed to fetch GPX:', error);
      return NextResponse.json({
        error: "Failed to fetch GPX file"
      }, { status: 500 });
    }

    // Parse track file
    const fileExtension = attempt.gpxS3Key.split('.').pop()?.toLowerCase();
    let parsed;

    try {
      if (fileExtension === 'vcc') {
        parsed = parseVccXml(gpxXml);
      } else if (fileExtension === 'csv') {
        parsed = parseVelocitkCsv(gpxXml);
      } else {
        parsed = parseGpxXml(gpxXml);
      }
    } catch (error) {
      console.error('Failed to parse track:', error);
      return NextResponse.json({
        error: "Failed to parse track file"
      }, { status: 500 });
    }

    const normalizedParsed = normalizeToParseGpx(parsed);

    // Run line validation
    const validation = validateGpxTrackForLines(
      normalizedParsed,
      { lat: attempt.course.startLat, lng: attempt.course.startLng },
      { lat: attempt.course.startLine2Lat!, lng: attempt.course.startLine2Lng! },
      { lat: attempt.course.finishLat, lng: attempt.course.finishLng },
      { lat: attempt.course.finishLine2Lat!, lng: attempt.course.finishLine2Lng! }
    );

    if (!validation.valid || !validation.timingDetails) {
      console.error('Line validation failed:', validation.error);
      return NextResponse.json({
        error: "Track validation failed: " + validation.error
      }, { status: 400 });
    }

    // Convert indices from timedPoints to full points array
    const allPoints = normalizedParsed.points;

    const timedToAllPointsMap = new Map<number, number>();
    let timedIndex = 0;
    for (let allIndex = 0; allIndex < allPoints.length; allIndex++) {
      if (allPoints[allIndex].time !== null) {
        timedToAllPointsMap.set(timedIndex, allIndex);
        timedIndex++;
      }
    }

    let raceStartIndex: number | undefined;
    let raceEndIndex: number | undefined;

    if (validation.timingDetails.lastStartCrossingIndex !== undefined) {
      const mappedIndex = timedToAllPointsMap.get(validation.timingDetails.lastStartCrossingIndex);
      if (mappedIndex !== undefined) {
        raceStartIndex = mappedIndex;
      }
    }

    if (validation.timingDetails.firstFinishCrossingIndex !== undefined) {
      const mappedIndex = timedToAllPointsMap.get(validation.timingDetails.firstFinishCrossingIndex);
      if (mappedIndex !== undefined) {
        raceEndIndex = mappedIndex;
      }
    }

    if (raceStartIndex === undefined || raceEndIndex === undefined) {
      return NextResponse.json({
        error: "Failed to calculate valid timing indices"
      }, { status: 500 });
    }

    // Update the attempt
    await prisma.fktAttempt.update({
      where: { id: attemptId },
      data: {
        raceStartIndex,
        raceEndIndex
      }
    });

    console.log('✅ Timing repaired successfully:', {
      attemptId,
      raceStartIndex,
      raceEndIndex
    });

    return NextResponse.json({
      success: true,
      message: "Timing data repaired successfully",
      raceStartIndex,
      raceEndIndex,
      timingDetails: validation.timingDetails
    });

  } catch (error) {
    console.error('Repair timing error:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}