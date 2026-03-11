/**
 * Storage abstraction: S3 in production, local filesystem in dev.
 * Controlled by USE_LOCAL_DEV=true in .env
 */

export const IS_LOCAL_DEV = process.env.USE_LOCAL_DEV === "true";

// ─── S3 / Production ────────────────────────────────────────────────────────

async function getS3PresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string
): Promise<string> {
  const { getPresignedUploadUrl } = await import("@/lib/s3");
  return getPresignedUploadUrl(bucket, key, contentType);
}

async function getS3PresignedDownloadUrl(
  bucket: string,
  key: string
): Promise<string> {
  const { getPresignedDownloadUrl } = await import("@/lib/s3");
  return getPresignedDownloadUrl(bucket, key);
}

// ─── Local dev ──────────────────────────────────────────────────────────────

const LOCAL_UPLOAD_DIR = process.env.LOCAL_UPLOAD_DIR ?? "./local-uploads";

/**
 * Returns a URL to a Next.js API route that handles the local upload.
 * The client PUTs the file to /api/dev/upload?key=<key>
 */
function getLocalUploadUrl(key: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/api/dev/upload?key=${encodeURIComponent(key)}`;
}

function getLocalDownloadUrl(key: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return `${base}/api/dev/file?key=${encodeURIComponent(key)}`;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export async function getUploadUrl(
  bucket: string,
  key: string,
  contentType: string
): Promise<string> {
  if (IS_LOCAL_DEV) return getLocalUploadUrl(key);
  return getS3PresignedUploadUrl(bucket, key, contentType);
}

export async function getDownloadUrl(
  bucket: string,
  key: string
): Promise<string> {
  if (IS_LOCAL_DEV) return getLocalDownloadUrl(key);
  return getS3PresignedDownloadUrl(bucket, key);
}

export async function readFileContent(
  bucket: string,
  key: string
): Promise<string> {
  if (IS_LOCAL_DEV) {
    const { readFile } = await import("fs/promises");
    const { join } = await import("path");
    return readFile(join(LOCAL_UPLOAD_DIR, key), "utf-8");
  }
  const { s3Client } = await import("@/lib/s3");
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const obj = await s3Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
  return obj.Body!.transformToString();
}

export function getPublicPhotoUrl(key: string): string {
  if (IS_LOCAL_DEV) {
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    return `${base}/api/dev/file?key=${encodeURIComponent(key)}`;
  }
  // Production: construct public S3 URL directly
  return `https://${process.env.S3_BUCKET_PHOTOS}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
