import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl, GPX_BUCKET } from "@/lib/s3";

export async function GET(
  _req: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  const attempt = await prisma.fktAttempt.findUnique({
    where: { id: params.attemptId },
    select: { gpxS3Key: true, status: true },
  });

  if (!attempt || attempt.status === "REJECTED") {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  const url = await getPresignedDownloadUrl(GPX_BUCKET, attempt.gpxS3Key);
  return NextResponse.json({ url });
}
