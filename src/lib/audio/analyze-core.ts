import { parseBuffer } from "music-metadata";
import {
  type AudioAnalysisOptions,
  type AudioAnalysisResult,
  normalizeMusicalKey,
  parseFilenameHints,
} from "@/lib/audio/analyze-shared";

function mimeTypeFromExtension(ext: string): string | undefined {
  if (ext === "mp3" || ext === "mpeg") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  return undefined;
}

/** Analyse buffer audio — utilisable serveur, scripts CLI, backfill */
export async function analyzeBufferCore(
  buffer: Buffer,
  options: AudioAnalysisOptions & { mimeType?: string } = {},
): Promise<AudioAnalysisResult> {
  const sources: string[] = [];
  const result: AudioAnalysisResult = { sources };
  const ext = options.mimeType?.includes("wav") ? "wav" : "mp3";

  try {
    const metadata = await parseBuffer(
      Uint8Array.from(buffer),
      { mimeType: mimeTypeFromExtension(ext) },
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
    // Analyse non bloquante
  }

  return result;
}

export async function analyzeBufferWithFilenameFallback(
  buffer: Buffer,
  originalFilename: string,
  options: AudioAnalysisOptions = {},
): Promise<AudioAnalysisResult> {
  const result = await analyzeBufferCore(buffer);

  if (!options.useFilenameHints) return result;

  const filenameHints = parseFilenameHints(originalFilename);

  if (!result.bpm && filenameHints.bpm) {
    result.bpm = filenameHints.bpm;
    result.sources.push("nom du fichier (fallback)");
  }

  if (!result.musicalKey && filenameHints.key) {
    const normalized = normalizeMusicalKey(filenameHints.key);
    if (normalized) {
      result.musicalKey = normalized;
      result.sources.push("nom du fichier (fallback)");
    }
  }

  return result;
}
