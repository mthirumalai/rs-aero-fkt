import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const attempt = await prisma.fktAttempt.findUnique({
      where: {
        id: params.attemptId,
        status: "APPROVED" // Only return approved attempts
      },
      include: {
        course: {
          select: {
            startLat: true,
            startLng: true,
            startType: true,
            startLine2Lat: true,
            startLine2Lng: true,
            finishLat: true,
            finishLng: true,
            finishType: true,
            finishLine2Lat: true,
            finishLine2Lng: true,
            turningMarkLat: true,
            turningMarkLng: true,
            courseType: true,
            name: true
          }
        }
      }
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        courseId: attempt.courseId,
        date: attempt.date,
        durationSec: attempt.durationSec,
        rigSize: attempt.rigSize,
        raceStartIndex: attempt.raceStartIndex,
        raceEndIndex: attempt.raceEndIndex
      },
      course: attempt.course
    });
  } catch (error) {
    console.error("Error fetching attempt:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}