import {
  DeleteObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3";

export async function deleteR2ObjectKey(
  client: S3Client,
  bucket: string,
  key: string,
): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
