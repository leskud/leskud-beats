import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "@/lib/config/env";

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!cachedClient) {
    const config = getR2Config();
    cachedClient = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  return cachedClient;
}

export function getR2BucketName(): string {
  return getR2Config().bucketName;
}
