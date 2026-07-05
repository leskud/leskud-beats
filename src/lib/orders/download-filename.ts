import type { LicenseType } from "@/lib/constants";
import type { DownloadFileType } from "@/lib/orders/download-entitlements";

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
  assetType: DownloadFileType,
  storagePath: string,
): string {
  if (assetType === "stems") {
    const ext = storagePath.split(".").pop()?.toLowerCase();
    return ext === "zip" || ext === "rar" ? ext : "zip";
  }

  if (assetType === "wav") return "wav";
  return "mp3";
}

/**
 * Suffixe distinct selon le fichier réellement téléchargé (assetType)
 * et la licence achetée (licenseType).
 */
export function buildAssetFilenameSuffix(
  assetType: DownloadFileType,
  licenseType: LicenseType,
): string {
  if (assetType === "mp3") {
    return "MP3";
  }

  if (assetType === "wav") {
    if (licenseType === "unlimited") return "WAV_UNLIMITED";
    if (licenseType === "exclusive") return "WAV_EXCLUSIVE-LEGACY";
    return "WAV_PREMIUM-WAV";
  }

  if (licenseType === "stems") return "STEMS_PREMIUM-STEMS";
  if (licenseType === "unlimited") return "STEMS_UNLIMITED";
  if (licenseType === "exclusive") return "STEMS_EXCLUSIVE-LEGACY";
  return "STEMS";
}

/**
 * Nom client payant — uniquement depuis les métadonnées beat en base.
 * Jamais depuis le nom du fichier uploadé ou le storage path.
 *
 * Exemples :
 * - HOODTRAP_TEST1_LESKUD_140BPM_C_MP3.mp3
 * - HOODTRAP_TEST1_LESKUD_140BPM_C_WAV_PREMIUM-WAV.wav
 * - HOODTRAP_TEST1_LESKUD_140BPM_C_STEMS_UNLIMITED.zip
 */
export function buildPaidDownloadFilename(params: {
  genre?: string | null;
  title: string;
  bpm?: number | null;
  musicalKey?: string | null;
  licenseType: LicenseType;
  assetType: DownloadFileType;
  storagePath: string;
}): string {
  const genre = sanitizePaidFilenamePart(params.genre ?? "", 24);
  const title = sanitizePaidFilenamePart(params.title, 48);
  const extension = extensionForDownloadFile(
    params.assetType,
    params.storagePath,
  );

  const segments: string[] = [genre, title, "LESKUD"];

  const bpm =
    params.bpm != null && params.bpm > 0 ? Math.round(params.bpm) : null;
  if (bpm) segments.push(`${bpm}BPM`);

  const key = params.musicalKey?.trim()
    ? formatKeyForDownloadFilename(params.musicalKey)
    : "";
  if (key) segments.push(key);

  segments.push(
    buildAssetFilenameSuffix(params.assetType, params.licenseType),
  );

  return `${segments.join("_")}.${extension}`;
}

/** Preview gratuite : TITRE_LESKUD_PREVIEW.mp3 (depuis beat.title uniquement) */
export function buildPreviewDownloadFilename(title: string): string {
  const slug = sanitizePaidFilenamePart(title, 64);
  return `${slug}_LESKUD_PREVIEW.mp3`;
}
