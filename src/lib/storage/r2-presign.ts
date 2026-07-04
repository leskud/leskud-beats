import "server-only";
import {
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2BucketName, getR2Client } from "@/lib/storage/r2-client";

const UPLOAD_EXPIRY_SECONDS = 15 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 10 * 60;

function attachmentDisposition(filename: string): string {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function createR2PresignedPutUrl(
  key: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_EXPIRY_SECONDS,
  });

  return { uploadUrl, key };
}

export async function createR2PresignedGetUrl(
  key: string,
  filename: string,
  contentType = "application/octet-stream",
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getR2BucketName(),
    Key: key,
    ResponseContentDisposition: attachmentDisposition(filename),
    ResponseContentType: contentType,
  });

  return getSignedUrl(getR2Client(), command, {
    expiresIn: DOWNLOAD_EXPIRY_SECONDS,
  });
}

export async function downloadR2ObjectBuffer(key: string): Promise<Buffer> {
  const response = await getR2Client().send(
    new GetObjectCommand({
      Bucket: getR2BucketName(),
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error(`Fichier R2 introuvable (${key}).`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
