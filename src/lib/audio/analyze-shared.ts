import { MUSICAL_KEYS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

export type AudioAnalysisResult = {
  duration?: number;
  bpm?: number;
  musicalKey?: string;
  sources: string[];
};

export const AUDIO_ANALYSIS_FAILED_MESSAGE =
  "Fichier enregistré, mais BPM/clé/durée non détectés automatiquement.";

export function parseFilenameHints(filename: string): {
  bpm?: number;
  key?: string;
} {
  const hints: { bpm?: number; key?: string } = {};
  const bpmMatch = filename.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) hints.bpm = Number(bpmMatch[1]);

  const keyMatch = filename.match(/\b([A-G][#b]?m?)\b/i);
  if (keyMatch) {
    const raw = keyMatch[1];
    hints.key =
      raw.endsWith("m") || raw.endsWith("M")
        ? `${raw.charAt(0).toUpperCase()}${raw.slice(1)}`
        : raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return hints;
}

export function normalizeMusicalKey(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;

  const cleaned = raw
    .trim()
    .replace(/\s+/g, "")
    .replace(/major/i, "")
    .replace(/minor/i, "m")
    .replace(/min$/i, "m");

  const direct = MUSICAL_KEYS.find(
    (key) => key.toLowerCase() === cleaned.toLowerCase(),
  );
  if (direct) return direct;

  const sharpMatch = cleaned.match(/^([A-G])#m?$/i);
  if (sharpMatch) {
    const letter = sharpMatch[1].toUpperCase();
    const isMinor = cleaned.toLowerCase().endsWith("m");
    const candidate = `${letter}#${isMinor ? "m" : ""}` as (typeof MUSICAL_KEYS)[number];
    if (MUSICAL_KEYS.includes(candidate)) return candidate;
  }

  const flatMatch = cleaned.match(/^([A-G])bm?$/i);
  if (flatMatch) {
    const letter = flatMatch[1].toUpperCase();
    const isMinor = cleaned.toLowerCase().endsWith("m");
    const flatMap: Record<string, string> = {
      A: "G#",
      B: "A#",
      D: "C#",
      E: "D#",
      G: "F#",
    };
    const equivalent = flatMap[letter];
    if (equivalent) {
      const candidate = `${equivalent}${isMinor ? "m" : ""}` as (typeof MUSICAL_KEYS)[number];
      if (MUSICAL_KEYS.includes(candidate)) return candidate;
    }
  }

  return undefined;
}

export function formatAnalysisSuccessMessage(
  result: Pick<AudioAnalysisResult, "bpm" | "musicalKey" | "duration">,
): string {
  const parts: string[] = [];

  if (result.bpm) parts.push(`${result.bpm} BPM`);
  if (result.musicalKey) parts.push(result.musicalKey);
  if (result.duration) parts.push(formatDuration(result.duration));

  if (parts.length === 0) return AUDIO_ANALYSIS_FAILED_MESSAGE;
  return `Analyse audio terminée : ${parts.join(" · ")}`;
}

export function hasAnalysisValues(
  result: Pick<AudioAnalysisResult, "bpm" | "musicalKey" | "duration">,
): boolean {
  return Boolean(result.bpm || result.musicalKey || result.duration);
}
