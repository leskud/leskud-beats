import type { LicenseType } from "@/lib/constants";
import type { BeatLicense } from "@/types/database";

export const DOWNLOAD_FILE_TYPES = ["mp3", "wav", "stems"] as const;
export type DownloadFileType = (typeof DOWNLOAD_FILE_TYPES)[number];

export const DOWNLOAD_FILE_LABELS: Record<DownloadFileType, string> = {
  mp3: "MP3",
  wav: "WAV",
  stems: "Stems",
};

type BeatLicensePath = Pick<BeatLicense, "license_type" | "storage_path">;

function hasStoragePath(
  licenses: BeatLicensePath[],
  type: DownloadFileType,
): boolean {
  const license = licenses.find((row) => row.license_type === type);
  return Boolean(license?.storage_path?.trim());
}

const ENTITLEMENT_MATRIX: Record<LicenseType, DownloadFileType[]> = {
  mp3: ["mp3"],
  wav: ["mp3", "wav"],
  stems: ["mp3", "wav", "stems"],
  unlimited: ["mp3", "wav", "stems"],
  exclusive: ["mp3", "wav", "stems"],
};

export function getEntitledFileTypes(
  purchasedLicense: LicenseType,
  beatLicenses: BeatLicensePath[],
): DownloadFileType[] {
  const candidates = ENTITLEMENT_MATRIX[purchasedLicense] ?? [];
  return candidates.filter((fileType) => hasStoragePath(beatLicenses, fileType));
}

export function isEntitledFileType(
  purchasedLicense: LicenseType,
  beatLicenses: BeatLicensePath[],
  fileType: DownloadFileType,
): boolean {
  return getEntitledFileTypes(purchasedLicense, beatLicenses).includes(fileType);
}

export function parseDownloadFileType(
  value: string | null | undefined,
): DownloadFileType | null {
  if (!value) return null;
  return DOWNLOAD_FILE_TYPES.includes(value as DownloadFileType)
    ? (value as DownloadFileType)
    : null;
}
