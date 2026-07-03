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
  const keyLabel = musicalKey.trim() || "—";
  const genreLabel = genre.trim() || "—";

  return `${name} — production LeSkud.

${bpmLabel} BPM · ${keyLabel} · ${genreLabel}

Beat professionnel disponible en licence MP3, WAV, Stems et Exclusive.
Idéal pour artistes, vidéos et projets créatifs.

© LeSkud — tous droits réservés.`;
}

export function parseFilenameHints(filename: string): {
  bpm?: number;
  key?: string;
} {
  const hints: { bpm?: number; key?: string } = {};
  const bpmMatch = filename.match(/(\d{2,3})\s*bpm/i);
  if (bpmMatch) hints.bpm = Number(bpmMatch[1]);

  const keyMatch = filename.match(
    /\b([A-G][#b]?m?)\b/i,
  );
  if (keyMatch) {
    const raw = keyMatch[1];
    hints.key = raw.endsWith("m") || raw.endsWith("M")
      ? raw.charAt(0).toUpperCase() + raw.slice(1)
      : raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return hints;
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
    if (key) result.key = key;

    return result;
  } catch {
    return {};
  }
}

export type AudioAnalysis = {
  duration?: number;
  bpm?: number;
  musicalKey?: string;
  source: string[];
};

export async function analyzeAudioFile(file: File): Promise<AudioAnalysis> {
  const source: string[] = [];
  const filenameHints = parseFilenameHints(file.name);

  const [metadata, duration, detectedBpm] = await Promise.all([
    readMetadataTags(file),
    getAudioDuration(file).catch(() => undefined),
    detectBpm(file),
  ]);

  const result: AudioAnalysis = { source };

  if (metadata.duration || duration) {
    result.duration = metadata.duration ?? duration;
    source.push("durée audio");
  }

  if (metadata.bpm) {
    result.bpm = metadata.bpm;
    source.push("tags fichier");
  } else if (filenameHints.bpm) {
    result.bpm = filenameHints.bpm;
    source.push("nom du fichier");
  } else if (detectedBpm) {
    result.bpm = detectedBpm;
    source.push("analyse audio");
  }

  if (metadata.key) {
    result.musicalKey = metadata.key;
    source.push("tags fichier");
  } else if (filenameHints.key) {
    result.musicalKey = filenameHints.key;
    source.push("nom du fichier");
  }

  return result;
}
