import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { GPX_BUCKET, PHOTOS_BUCKET } from "@/lib/s3";
import { getUploadUrl } from "@/lib/storage";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, filename, contentType } = await req.json();

  if (!type || !filename || !contentType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "";
  const key = `${session.user.id}/${randomUUID()}.${ext}`;

  let bucket: string;
  let maxSize: number;

  if (type === "gpx") {
    bucket = GPX_BUCKET;
    maxSize = 10 * 1024 * 1024;
    // Accept GPX, CSV, and VCC track file formats
    const validContentTypes = [
      "application/gpx+xml",
      "application/xml",
      "text/xml",
      "text/csv",           // CSV files
      "application/octet-stream"
    ];
    if (!validContentTypes.includes(contentType)) {
      return NextResponse.json({ error: "Invalid track file content type" }, { status: 400 });
    }
  } else if (type === "photo") {
    bucket = PHOTOS_BUCKET;
    maxSize = 5 * 1024 * 1024;
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Invalid photo content type" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Invalid upload type" }, { status: 400 });
  }

  const uploadUrl = await getUploadUrl(bucket, key, contentType);

  return NextResponse.json({ uploadUrl, key, maxSize });
}
