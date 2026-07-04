import {
  type AudioAnalysisOptions,
  type AudioAnalysisResult,
  applyAnalysisFillEmptyOnly,
  formatAnalysisSuccessMessage,
  hasAnalysisValues,
  normalizeMusicalKey,
  parseFilenameHints,
  AUDIO_ANALYSIS_FAILED_MESSAGE,
} from "@/lib/audio/analyze-shared";

export {
  type AudioAnalysisResult,
  applyAnalysisFillEmptyOnly,
  formatAnalysisSuccessMessage,
  formatReanalysisPreview,
  AUDIO_ANALYSIS_FAILED_MESSAGE,
} from "@/lib/audio/analyze-shared";

export function buildDefaultDescription({
  title,
  bpm,
  musicalKey,
  genre,
}: {
  title: string;
  bpm: string;
  musicalKey: string;
  genre: string;
}) {
  const name = title.trim() || "Beat";
  const bpmLabel = bpm.trim() || "—";
  const keyLabel = musicalKey.trim() || "À renseigner";
  const genreLabel = genre.trim() || "—";

  return `${name} — production LeSkud.

${bpmLabel} BPM · ${keyLabel} · ${genreLabel}

Beat professionnel disponible en licence MP3, WAV, Stems et Unlimited.
Idéal pour artistes, vidéos et projets créatifs.

© LeSkud — tous droits réservés.`;
}

async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration));
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire la durée audio."));
    };
    audio.src = url;
  });
}

async function detectBpm(file: File): Promise<number | null> {
  try {
    const { analyzeFullBuffer } = await import("realtime-bpm-analyzer");
    const context = new AudioContext();
    const buffer = await file.arrayBuffer();
    const audioBuffer = await context.decodeAudioData(buffer);
    const tempos = await analyzeFullBuffer(audioBuffer);
    await context.close();
    const tempo = Math.round(tempos[0]?.tempo ?? 0);
    if (tempo >= 60 && tempo <= 200) return tempo;
    return null;
  } catch {
    return null;
  }
}

async function readMetadataTags(file: File): Promise<{
  bpm?: number;
  key?: string;
  duration?: number;
}> {
  try {
    const { parseBlob } = await import("music-metadata-browser");
    const metadata = await parseBlob(file);
    const result: { bpm?: number; key?: string; duration?: number } = {};

    if (metadata.format.duration) {
      result.duration = Math.round(metadata.format.duration);
    }

    const bpm = metadata.common.bpm;
    if (typeof bpm === "number" && bpm > 0) result.bpm = Math.round(bpm);

    const key = metadata.common.key;
    if (typeof key === "string") {
      const normalized = normalizeMusicalKey(key);
      if (normalized) result.key = normalized;
    }

    return result;
  } catch {
    return {};
  }
}

export type AudioAnalysis = AudioAnalysisResult;

export type AnalyzeAudioFileOptions = AudioAnalysisOptions;

export async function analyzeAudioFile(
  file: File,
  options: AnalyzeAudioFileOptions = {},
): Promise<AudioAnalysis> {
  const sources: string[] = [];
  const useFilenameHints = options.useFilenameHints ?? true;

  const [metadata, duration, detectedBpm] = await Promise.all([
    readMetadataTags(file),
    getAudioDuration(file).catch(() => undefined),
    detectBpm(file),
  ]);

  const result: AudioAnalysis = { sources };

  if (metadata.duration || duration) {
    result.duration = metadata.duration ?? duration;
    sources.push("durée audio");
  }

  if (metadata.bpm) {
    result.bpm = metadata.bpm;
    sources.push("tags fichier");
  } else if (detectedBpm) {
    result.bpm = detectedBpm;
    sources.push("analyse audio");
  }

  if (metadata.key) {
    result.musicalKey = metadata.key;
    sources.push("tags fichier");
  }

  if (useFilenameHints) {
    const filenameHints = parseFilenameHints(file.name);
    if (!result.bpm && filenameHints.bpm) {
      result.bpm = filenameHints.bpm;
      sources.push("nom du fichier (fallback)");
    }
    if (!result.musicalKey && filenameHints.key) {
      const normalized = normalizeMusicalKey(filenameHints.key);
      if (normalized) {
        result.musicalKey = normalized;
        sources.push("nom du fichier (fallback)");
      }
    }
  }

  return result;
}

export function formatClientAnalysisMessage(
  analysis: Pick<AudioAnalysis, "bpm" | "musicalKey" | "duration">,
  options?: { preservedExisting?: boolean },
): string {
  if (hasAnalysisValues(analysis)) {
    const base = formatAnalysisSuccessMessage(analysis);
    if (options?.preservedExisting) {
      return `${base} Valeurs existantes conservées — utilisez « Ré-analyser l'audio » pour appliquer.`;
    }
    return base;
  }
  return "BPM/clé/durée non détectés automatiquement — complétez manuellement.";
}
