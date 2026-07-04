import type { LicenseType } from "@/lib/constants";
import type { DownloadFileType } from "@/lib/orders/download-entitlements";

const LICENSE_FILENAME_LABELS: Record<LicenseType, string> = {
  mp3: "MP3",
  wav: "PREMIUM-WAV",
  stems: "PREMIUM-STEMS",
  unlimited: "UNLIMITED-STEMS",
  exclusive: "EXCLUSIVE-LEGACY",
};

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

/** Segment ASCII uppercase pour noms de fichiers payants */
export function sanitizePaidFilenamePart(value: string, maxLength = 40): string {
  const cleaned = stripAccents(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!cleaned) return "BEAT";
  return cleaned.slice(0, maxLength);
}

export function formatKeyForDownloadFilename(musicalKey: string): string {
  const cleaned = stripAccents(musicalKey.trim())
    .replace(/#/g, "SHARP")
    .toUpperCase();

  if (!cleaned) return "";
  return cleaned;
}

export function extensionForDownloadFile(
  fileType: DownloadFileType,
  storagePath: string,
): string {
  if (fileType === "stems") {
    const ext = storagePath.split(".").pop()?.toLowerCase();
    return ext === "zip" || ext === "rar" ? ext : "zip";
  }

  if (fileType === "wav") return "wav";
  return "mp3";
}

/**
 * Nom client payant — uniquement depuis les métadonnées beat en base.
 * Jamais depuis le nom du fichier uploadé ou le storage path.
 */
export function buildPaidDownloadFilename(params: {
  genre?: string | null;
  title: string;
  bpm?: number | null;
  musicalKey?: string | null;
  licenseType: LicenseType;
  fileType: DownloadFileType;
  storagePath: string;
}): string {
  const genre = sanitizePaidFilenamePart(params.genre ?? "", 24);
  const title = sanitizePaidFilenamePart(params.title, 48);
  const licenseLabel = LICENSE_FILENAME_LABELS[params.licenseType] ?? "LICENSE";
  const extension = extensionForDownloadFile(params.fileType, params.storagePath);

  const segments: string[] = [genre, title, "LESKUD"];

  const bpm = params.bpm != null && params.bpm > 0 ? Math.round(params.bpm) : null;
  if (bpm) segments.push(`${bpm}BPM`);

  const key = params.musicalKey?.trim()
    ? formatKeyForDownloadFilename(params.musicalKey)
    : "";
  if (key) segments.push(key);

  segments.push(licenseLabel);

  return `${segments.join("_")}.${extension}`;
}

/** Preview gratuite : TITRE_LESKUD_PREVIEW.mp3 (depuis beat.title uniquement) */
export function buildPreviewDownloadFilename(title: string): string {
  const slug = sanitizePaidFilenamePart(title, 64);
  return `${slug}_LESKUD_PREVIEW.mp3`;
}
