/**
 * Local dev only: serves files that would normally be in S3.
 */
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "./local-uploads";

export async function GET(req: NextRequest) {
  if (process.env.USE_LOCAL_DEV !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  try {
    const filePath = join(LOCAL_UPLOAD_DIR, key);
    const data = await readFile(filePath);
    const contentType = key.endsWith(".gpx") ? "application/gpx+xml" : "application/octet-stream";
    return new NextResponse(data, {
      headers: { "Content-Type": contentType },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
