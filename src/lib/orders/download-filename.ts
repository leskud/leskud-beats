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

  if (!cleaned) return "UNKNOWN";
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

export function buildPaidDownloadFilename(params: {
  genre: string;
  title: string;
  bpm: number;
  musicalKey: string;
  licenseType: LicenseType;
  fileType: DownloadFileType;
  storagePath: string;
}): string {
  const genre = sanitizePaidFilenamePart(params.genre, 24);
  const title = sanitizePaidFilenamePart(params.title, 48);
  const bpm = Math.round(params.bpm);
  const key = formatKeyForDownloadFilename(params.musicalKey);
  const licenseLabel = LICENSE_FILENAME_LABELS[params.licenseType] ?? "LICENSE";
  const extension = extensionForDownloadFile(params.fileType, params.storagePath);

  return `${genre}_${title}_LESKUD_${bpm}BPM_${key}_${licenseLabel}.${extension}`;
}

/** Preview gratuite : TITRE_LESKUD_PREVIEW.mp3 */
export function buildPreviewDownloadFilename(title: string): string {
  const slug = sanitizePaidFilenamePart(title, 64);
  return `${slug}_LESKUD_PREVIEW.mp3`;
}
