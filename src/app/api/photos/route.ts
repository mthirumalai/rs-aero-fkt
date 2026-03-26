import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { attemptId, s3Key, caption } = body;

  if (!attemptId || !s3Key) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify the attempt exists and user has permission
  const attempt = await prisma.fktAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      athleteId: true,
      sailorEmail: true,
      status: true
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Check if user has permission (is the athlete or sailor)
  const userEmail = session.user.email;
  const canUpload =
    attempt.athleteId === session.user.id || // User is the athlete who submitted
    (attempt.sailorEmail && attempt.sailorEmail === userEmail); // User is the sailor

  if (!canUpload) {
    return NextResponse.json({
      error: "You can only upload photos for your own attempts"
    }, { status: 403 });
  }

  try {
    const photo = await prisma.attemptPhoto.create({
      data: {
        attemptId,
        s3Key,
        caption: caption || null,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error) {
    console.error("Failed to create photo record:", error);
    return NextResponse.json({
      error: "Failed to save photo"
    }, { status: 500 });
  }
}