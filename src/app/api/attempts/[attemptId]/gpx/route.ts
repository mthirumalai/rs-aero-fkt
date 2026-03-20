import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GPX_BUCKET } from "@/lib/s3";
import { getDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const attempt = await prisma.fktAttempt.findUnique({
    where: { id: params.attemptId },
    select: { gpxS3Key: true, status: true },
  });

  if (!attempt) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Allow viewing GPX files for REJECTED attempts (needed for admin diagnosis)

  const url = await getDownloadUrl(GPX_BUCKET, attempt.gpxS3Key);
  return NextResponse.json({ url });
}
