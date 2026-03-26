import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GPX_BUCKET } from "@/lib/s3";
import { readFileContent } from "@/lib/storage";

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

  try {
    const content = await readFileContent(GPX_BUCKET, attempt.gpxS3Key);
    const fileExtension = attempt.gpxS3Key.split('.').pop()?.toLowerCase() || 'gpx';

    // Determine content type based on file extension
    let contentType = 'application/gpx+xml';
    if (fileExtension === 'vcc') {
      contentType = 'application/xml';
    } else if (fileExtension === 'csv') {
      contentType = 'text/csv';
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="track.${fileExtension}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to retrieve track file" }, { status: 500 });
  }
}
