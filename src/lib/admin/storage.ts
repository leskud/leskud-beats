import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKETS } from "@/lib/constants";

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "";
  return `.${parts.pop()!.toLowerCase()}`;
}

export async function uploadBeatBuffer(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string,
) {
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload échoué (${path}) : ${error.message}`);
  }

  return path;
}

export async function uploadBeatFile(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  file: File,
) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload échoué (${path}) : ${error.message}`);
  }

  return path;
}

export async function removeBeatFiles(
  supabase: SupabaseClient,
  beatId: string,
) {
  const buckets = [
    STORAGE_BUCKETS.covers,
    STORAGE_BUCKETS.previews,
    STORAGE_BUCKETS.beats,
  ];

  for (const bucket of buckets) {
    const { data: files } = await supabase.storage.from(bucket).list(beatId);
    if (files?.length) {
      const paths = files.map((f) => `${beatId}/${f.name}`);
      await supabase.storage.from(bucket).remove(paths);
    }
  }
}

export async function downloadBeatBuffer(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
): Promise<Buffer> {
  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error || !data) {
    throw new Error(`Téléchargement échoué (${path}) : ${error?.message}`);
  }

  return Buffer.from(await data.arrayBuffer());
}

export function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}
