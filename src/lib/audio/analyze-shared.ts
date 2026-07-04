import { MUSICAL_KEYS } from "@/lib/constants";
import { formatDuration } from "@/lib/utils";

export type AudioAnalysisResult = {
  duration?: number;
  bpm?: number;
  musicalKey?: string;
  sources: string[];
};

export type AudioAnalysisOptions = {
  /** Fallback très secondaire — uniquement si tags/audio n'ont rien donné */
  useFilenameHints?: boolean;
};

export const AUDIO_ANALYSIS_FAILED_MESSAGE =
  "Fichier enregistré, mais BPM/clé/durée non détectés automatiquement.";

/** Camelot → clé (tags DJ courants) */
const CAMELOT_TO_KEY: Record<string, string> = {
  "1A": "Abm",
  "1B": "B",
  "2A": "Ebm",
  "2B": "Gb",
  "3A": "Bbm",
  "3B": "Db",
  "4A": "Fm",
  "4B": "Ab",
  "5A": "Cm",
  "5B": "Eb",
  "6A": "Gm",
  "6B": "Bb",
  "7A": "Dm",
  "7B": "F",
  "8A": "Am",
  "8B": "C",
  "9A": "Em",
  "9B": "G",
  "10A": "Bm",
  "10B": "D",
  "11A": "F#m",
  "11B": "A",
  "12A": "C#m",
  "12B": "E",
};

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

  const trimmed = raw.trim();

  const camelot = trimmed.match(/^(\d{1,2}[AB])$/i);
  if (camelot) {
    const mapped = CAMELOT_TO_KEY[camelot[1].toUpperCase()];
    if (mapped && MUSICAL_KEYS.includes(mapped as (typeof MUSICAL_KEYS)[number])) {
      return mapped;
    }
  }

  const cleaned = trimmed
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
  const summary = buildReanalysisSummaryLabel(result);
  if (summary === "Aucune valeur détectée automatiquement") {
    return AUDIO_ANALYSIS_FAILED_MESSAGE;
  }
  return summary;
}

export function hasAnalysisValues(
  result: Pick<AudioAnalysisResult, "bpm" | "musicalKey" | "duration">,
): boolean {
  return Boolean(result.bpm || result.musicalKey || result.duration);
}

export type ReanalysisPreview = {
  summary: string;
  detailLines: string[];
  bpmDetected: boolean;
  keyDetected: boolean;
  durationDetected: boolean;
  bpm?: number;
  musicalKey?: string;
  duration?: number;
};

function buildDetectionSummary(
  result: Pick<AudioAnalysisResult, "bpm" | "musicalKey" | "duration">,
): string | null {
  const bpmDetected = Boolean(result.bpm);
  const keyDetected = Boolean(result.musicalKey);
  const durationDetected = Boolean(result.duration);
  const detectedCount = [bpmDetected, keyDetected, durationDetected].filter(
    Boolean,
  ).length;

  if (detectedCount === 0) return null;

  if (detectedCount === 3) {
    return `${result.bpm} BPM · ${result.musicalKey} · ${formatDuration(result.duration!)}`;
  }

  if (durationDetected && !bpmDetected && !keyDetected) {
    return formatDuration(result.duration!);
  }

  if (bpmDetected && !keyDetected && !durationDetected) {
    return `${result.bpm} BPM`;
  }

  if (keyDetected && !bpmDetected && !durationDetected) {
    return result.musicalKey!;
  }

  const parts: string[] = [];
  if (bpmDetected) parts.push(`${result.bpm} BPM`);
  if (keyDetected) parts.push(result.musicalKey!);
  if (durationDetected) parts.push(formatDuration(result.duration!));
  return parts.join(" · ");
}

function buildReanalysisSummaryLabel(
  result: Pick<AudioAnalysisResult, "bpm" | "musicalKey" | "duration">,
): string {
  const bpmDetected = Boolean(result.bpm);
  const keyDetected = Boolean(result.musicalKey);
  const durationDetected = Boolean(result.duration);
  const detectedCount = [bpmDetected, keyDetected, durationDetected].filter(
    Boolean,
  ).length;

  if (detectedCount === 0) {
    return "Aucune valeur détectée automatiquement";
  }

  const valueSummary = buildDetectionSummary(result);
  if (!valueSummary) return "Aucune valeur détectée automatiquement";

  if (detectedCount === 3) {
    return `Analyse trouvée : ${valueSummary}`;
  }

  if (durationDetected && !bpmDetected && !keyDetected) {
    return `Durée détectée : ${valueSummary}`;
  }

  if (bpmDetected && !keyDetected && !durationDetected) {
    return `BPM détecté : ${valueSummary}`;
  }

  if (keyDetected && !bpmDetected && !durationDetected) {
    return `Clé détectée : ${valueSummary}`;
  }

  return `Analyse partielle : ${valueSummary}`;
}

export function formatReanalysisPreview(
  result: AudioAnalysisResult,
): ReanalysisPreview {
  const bpmDetected = Boolean(result.bpm);
  const keyDetected = Boolean(result.musicalKey);
  const durationDetected = Boolean(result.duration);

  const detailLines: string[] = [];
  if (!bpmDetected) {
    detailLines.push(
      "BPM non détecté automatiquement — à renseigner manuellement.",
    );
  }
  if (!keyDetected) {
    detailLines.push(
      "Clé non détectée automatiquement — à renseigner manuellement.",
    );
  }
  if (!durationDetected) {
    detailLines.push(
      "Durée non détectée automatiquement — à renseigner manuellement.",
    );
  }

  return {
    summary: buildReanalysisSummaryLabel(result),
    detailLines,
    bpmDetected,
    keyDetected,
    durationDetected,
    bpm: result.bpm,
    musicalKey: result.musicalKey,
    duration: result.duration,
  };
}

/** Remplit uniquement les champs vides — ne jamais écraser une valeur existante */
export function applyAnalysisFillEmptyOnly<T extends {
  bpm?: number;
  musicalKey?: string;
  duration?: number;
}>(
  current: { bpm?: number | string; musicalKey?: string; duration?: number | string },
  detected: T,
): T {
  const applied: T = {} as T;

  const currentBpm = Number(current.bpm);
  const currentDuration = Number(current.duration);

  if (detected.bpm && (!current.bpm || currentBpm < 1)) {
    applied.bpm = detected.bpm;
  }
  if (detected.musicalKey && !current.musicalKey?.trim()) {
    applied.musicalKey = detected.musicalKey;
  }
  if (detected.duration && (!current.duration || currentDuration < 1)) {
    applied.duration = detected.duration;
  }

  return applied;
}
