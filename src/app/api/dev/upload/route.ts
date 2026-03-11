/**
 * Local dev only: receives file uploads that would normally go to S3.
 * The client PUTs to this endpoint instead of a presigned S3 URL.
 */
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "./local-uploads";

export async function PUT(req: NextRequest) {
  if (process.env.USE_LOCAL_DEV !== "true") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const filePath = join(LOCAL_UPLOAD_DIR, key);
  await mkdir(dirname(filePath), { recursive: true });

  const buffer = Buffer.from(await req.arrayBuffer());
  await writeFile(filePath, buffer);

  return new NextResponse(null, { status: 200 });
}
