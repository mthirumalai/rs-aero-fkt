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
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3Client, command, { expiresIn });
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
