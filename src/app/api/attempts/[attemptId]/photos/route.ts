import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPublicPhotoUrl } from "@/lib/storage";

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

  // Generate full URLs for photos server-side
  const photosWithUrls = attempt.photos.map(photo => ({
    ...photo,
    url: getPublicPhotoUrl(photo.s3Key)
  }));

  return NextResponse.json(photosWithUrls);
}