import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { s3Client, GPX_BUCKET } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { parseGpxXml } from "@/lib/gpx/parser";
import { validateGpxTrack } from "@/lib/gpx/validator";
import { computeSog, computeAvgMaxSog } from "@/lib/gpx/sog";
import type { RigSize } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    routeId,
    rigSize,
    date,
    gpxS3Key,
    windSpeedKnots,
    windDirection,
    currentNotes,
    writeUp,
  } = body;

  if (!routeId || !rigSize || !date || !gpxS3Key) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate rig size
  const validRigSizes: RigSize[] = ["AERO_5", "AERO_6", "AERO_7", "AERO_9"];
  if (!validRigSizes.includes(rigSize)) {
    return NextResponse.json({ error: "Invalid rig size" }, { status: 400 });
  }

  // Fetch route
  const route = await prisma.route.findUnique({
    where: { id: routeId, status: "APPROVED" },
  });
  if (!route) {
    return NextResponse.json({ error: "Route not found or not approved" }, { status: 404 });
  }

  // Fetch GPX from S3
  let gpxXml: string;
  try {
    const obj = await s3Client.send(
      new GetObjectCommand({ Bucket: GPX_BUCKET, Key: gpxS3Key })
    );
    gpxXml = await obj.Body!.transformToString();
  } catch {
    return NextResponse.json({ error: "Failed to fetch GPX file from S3" }, { status: 500 });
  }

  // Parse and validate GPX
  const parsed = parseGpxXml(gpxXml);
  const validation = validateGpxTrack(
    parsed,
    route.startLat,
    route.startLng,
    route.endLat,
    route.endLng
  );

  if (!validation.valid) {
    return NextResponse.json(
      {
        error: validation.error,
        nearestStartDistanceM: validation.nearestStartDistanceM,
        nearestEndDistanceM: validation.nearestEndDistanceM,
      },
      { status: 422 }
    );
  }

  // Compute SOG stats
  const sogPoints = computeSog(parsed.points);
  const { avgSogKnots, maxSogKnots } = computeAvgMaxSog(sogPoints);

  // Save attempt
  const attempt = await prisma.fktAttempt.create({
    data: {
      routeId,
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
      status: "APPROVED",
    },
  });

  return NextResponse.json(attempt, { status: 201 });
}
