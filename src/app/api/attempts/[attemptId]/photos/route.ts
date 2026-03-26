import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const attempt = await prisma.fktAttempt.findUnique({
    where: {
      id: params.attemptId,
      status: "APPROVED" // Only show photos for approved attempts
    },
    select: {
      id: true,
      photos: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          s3Key: true,
          caption: true,
          createdAt: true,
        },
      },
    },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  return NextResponse.json(attempt.photos);
}