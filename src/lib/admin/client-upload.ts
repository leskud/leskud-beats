import { createClient } from "@/lib/supabase/client";
import {
  getBeatFileContentType,
  getBeatFileLabel,
  type BeatFileKind,
} from "@/lib/admin/beat-paths";

export async function uploadBeatFileFromBrowser(
  beatId: string,
  kind: BeatFileKind,
  file: File,
): Promise<string> {
  const prepareResponse = await fetch(`/api/admin/beats/${beatId}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kind,
      filename: file.name,
    }),
  });

  const prepareData = (await prepareResponse.json().catch(() => null)) as {
    error?: string;
    bucket?: string;
    path?: string;
    token?: string;
  } | null;

  if (!prepareResponse.ok || !prepareData?.path || !prepareData.token) {
    throw new Error(
      prepareData?.error ??
        `Impossible de préparer l'upload ${getBeatFileLabel(kind)}.`,
    );
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(prepareData.bucket!)
    .uploadToSignedUrl(prepareData.path, prepareData.token, file, {
      contentType: file.type || getBeatFileContentType(kind),
      upsert: true,
    });

  if (error) {
    throw new Error(
      `Upload ${getBeatFileLabel(kind)} échoué : ${error.message}`,
    );
  }

  return prepareData.path;
}

export type UploadProgressCallback = (message: string) => void;

export async function uploadBeatFilesFromBrowser(
  beatId: string,
  files: Partial<Record<BeatFileKind, File>>,
  onProgress?: UploadProgressCallback,
): Promise<Partial<Record<BeatFileKind, string>>> {
  const uploaded: Partial<Record<BeatFileKind, string>> = {};

  for (const kind of ["cover", "mp3", "wav", "stems"] as BeatFileKind[]) {
    const file = files[kind];
    if (!file?.size) continue;

    onProgress?.(`Upload ${getBeatFileLabel(kind)} en cours… (${formatMo(file.size)})`);
    uploaded[kind] = await uploadBeatFileFromBrowser(beatId, kind, file);
    onProgress?.(`Upload ${getBeatFileLabel(kind)} terminé.`);
  }

  return uploaded;
}

function formatMo(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
