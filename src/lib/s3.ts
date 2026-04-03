import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const GPX_BUCKET = process.env.S3_BUCKET_GPX!;
export const PHOTOS_BUCKET = process.env.S3_BUCKET_PHOTOS!;

export async function getPresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  try {
    console.log(`🔗 [S3_PRESIGN] Generating presigned URL:`, {
      bucket,
      key,
      contentType,
      expiresIn,
      region: process.env.AWS_REGION
    });

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });

    console.log(`✅ [S3_PRESIGN_SUCCESS] Presigned URL generated for bucket: ${bucket}`);
    return url;
  } catch (error) {
    console.error(`❌ [S3_PRESIGN_ERROR] Failed to generate presigned URL:`, {
      bucket,
      key,
      contentType,
      region: process.env.AWS_REGION,
      error: error instanceof Error ? error.message : String(error),
      errorCode: error instanceof Error && 'code' in error ? (error as Error & { code: string }).code : 'Unknown'
    });
    throw error;
  }
}

export async function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteS3Object(bucket: string, key: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}

export function getPhotoUrl(key: string): string {
  return `https://${PHOTOS_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}
