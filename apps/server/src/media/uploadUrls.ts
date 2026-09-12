import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config.js";

/**
 * Works against AWS S3 or Cloudflare R2 (R2 is S3-compatible) — just point
 * S3_ENDPOINT at the R2 account endpoint. Throws if no bucket is configured;
 * callers should treat that as "storage not set up yet" rather than a bug.
 */
function getClient(): S3Client {
  if (!config.s3.bucket) {
    throw new Error("S3_BUCKET is not configured");
  }
  return new S3Client({
    region: config.s3.region,
    endpoint: config.s3.endpoint || undefined,
    credentials: config.s3.accessKeyId
      ? { accessKeyId: config.s3.accessKeyId, secretAccessKey: config.s3.secretAccessKey }
      : undefined,
  });
}

export function objectKeyFor(roomId: string, photoId: string): string {
  return `rooms/${roomId}/${photoId}`;
}

export async function createUploadUrl(objectKey: string): Promise<string> {
  const client = getClient();
  const command = new PutObjectCommand({ Bucket: config.s3.bucket, Key: objectKey });
  return getSignedUrl(client, command, { expiresIn: config.photoUploadUrlTtlSeconds });
}

export async function createDownloadUrl(objectKey: string): Promise<string> {
  const client = getClient();
  const command = new GetObjectCommand({ Bucket: config.s3.bucket, Key: objectKey });
  return getSignedUrl(client, command, { expiresIn: config.photoUploadUrlTtlSeconds });
}

export async function deleteObject(objectKey: string): Promise<void> {
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: objectKey }));
}

export function isStorageConfigured(): boolean {
  return Boolean(config.s3.bucket);
}

/** What the client should actually offer — the explicit flag AND a real bucket. */
export function photosEnabled(): boolean {
  return config.enablePhotos && isStorageConfigured();
}
