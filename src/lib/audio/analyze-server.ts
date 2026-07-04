import "server-only";
import { parseBuffer } from "music-metadata";
import {
  type AudioAnalysisResult,
  normalizeMusicalKey,
  parseFilenameHints,
} from "@/lib/audio/analyze-shared";

function extensionFromPath(path: string): string {
  return path.split(".").pop()?.toLowerCase() ?? "";
}

export async function analyzeAudioBuffer(
  buffer: Buffer,
  filename = "audio",
): Promise<AudioAnalysisResult> {
  const sources: string[] = [];
  const result: AudioAnalysisResult = { sources };
  const filenameHints = parseFilenameHints(filename);

  try {
    const metadata = await parseBuffer(
      Uint8Array.from(buffer),
      { mimeType: mimeTypeFromExtension(extensionFromPath(filename)) },
      { duration: true },
    );

    if (metadata.format.duration && metadata.format.duration > 0) {
      result.duration = Math.round(metadata.format.duration);
      sources.push("métadonnées audio");
    }

    const tagBpm = metadata.common.bpm;
    if (typeof tagBpm === "number" && tagBpm > 0) {
      const rounded = Math.round(tagBpm);
      if (rounded >= 60 && rounded <= 220) {
        result.bpm = rounded;
        sources.push("tags fichier");
      }
    }

    const tagKey = metadata.common.key;
    const normalizedKey = normalizeMusicalKey(
      typeof tagKey === "string" ? tagKey : undefined,
    );
    if (normalizedKey) {
      result.musicalKey = normalizedKey;
      sources.push("tags fichier");
    }
  } catch {
    // Continue with filename hints only
  }

  if (!result.bpm && filenameHints.bpm) {
    result.bpm = filenameHints.bpm;
    sources.push("nom du fichier");
  }

  if (!result.musicalKey && filenameHints.key) {
    const normalized = normalizeMusicalKey(filenameHints.key);
    if (normalized) {
      result.musicalKey = normalized;
      sources.push("nom du fichier");
    }
  }

  return result;
}

function mimeTypeFromExtension(ext: string): string | undefined {
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  return undefined;
}
