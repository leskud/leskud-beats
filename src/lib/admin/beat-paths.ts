import { STORAGE_BUCKETS } from "@/lib/constants";

export const BEAT_FILE_KINDS = ["mp3", "wav", "stems", "cover"] as const;
export type BeatFileKind = (typeof BEAT_FILE_KINDS)[number];

export function getBeatFilePath(beatId: string, kind: BeatFileKind): string {
  switch (kind) {
    case "mp3":
      return `${beatId}/mp3.mp3`;
    case "wav":
      return `${beatId}/wav.wav`;
    case "stems":
      return `${beatId}/stems.zip`;
    case "cover":
      return `${beatId}/cover.jpg`;
  }
}

export function getBeatFileBucket(kind: BeatFileKind): string {
  return kind === "cover" ? STORAGE_BUCKETS.covers : STORAGE_BUCKETS.beats;
}

export function getBeatFileContentType(kind: BeatFileKind): string {
  switch (kind) {
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "stems":
      return "application/zip";
    case "cover":
      return "image/jpeg";
  }
}

export function getBeatFileLabel(kind: BeatFileKind): string {
  switch (kind) {
    case "mp3":
      return "MP3";
    case "wav":
      return "WAV";
    case "stems":
      return "Stems (ZIP)";
    case "cover":
      return "Cover";
  }
}

export const PAID_BEAT_FILE_KINDS = ["mp3", "wav", "stems"] as const;

export function isPaidBeatFileKind(kind: BeatFileKind): boolean {
  return (PAID_BEAT_FILE_KINDS as readonly string[]).includes(kind);
}

export function resolveCoverPath(beatId: string, filename: string): string {
  const ext = filename.includes(".")
    ? `.${filename.split(".").pop()!.toLowerCase()}`
    : ".jpg";
  return `${beatId}/cover${ext}`;
}
