import { execFile } from "node:child_process";
import {
  accessSync,
  constants,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { resolveFfmpegExecutable } from "@/lib/audio/ffmpeg-path";
import { parseFile } from "music-metadata";

const execFileAsync = promisify(execFile);

/** Délai avant le 1er tag vocal (la prod démarre clean) */
const FIRST_TAG_DELAY_SECONDS = 15;
/** Intervalle entre chaque tag */
const WATERMARK_INTERVAL_SECONDS = 25;
/** Volume du tag — audible pendant le tag, prod domine le reste du temps */
const WATERMARK_TAG_VOLUME = 0.3;

const AUDIO_FORMAT =
  "aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo";

async function getAudioDurationSeconds(filePath: string): Promise<number> {
  const metadata = await parseFile(filePath);
  const duration = metadata.format.duration;
  if (!duration || duration <= 0) return 180;
  return Math.ceil(duration);
}

async function getWatermarkTagDurationSeconds(
  watermarkPath: string,
): Promise<number> {
  const metadata = await parseFile(watermarkPath);
  const duration = metadata.format.duration;
  if (!duration || duration <= 0) return 2;
  return duration;
}

function getTagTimestamps(
  durationSeconds: number,
  tagDurationSeconds: number,
): number[] {
  const timestamps: number[] = [];
  for (
    let t = FIRST_TAG_DELAY_SECONDS;
    t + tagDurationSeconds < durationSeconds;
    t += WATERMARK_INTERVAL_SECONDS
  ) {
    timestamps.push(t);
  }
  return timestamps;
}

function buildWatermarkFilter(
  durationSeconds: number,
  tagDurationSeconds: number,
): string {
  const timestamps = getTagTimestamps(durationSeconds, tagDurationSeconds);
  const count = timestamps.length;
  const tagTrim = tagDurationSeconds.toFixed(3);

  if (count === 0) {
    return `[0:a]${AUDIO_FORMAT},alimiter=limit=0.98[out]`;
  }

  const splitLabels = Array.from({ length: count }, (_, i) => `[tag${i}]`).join(
    "",
  );

  const parts: string[] = [
    `[0:a]${AUDIO_FORMAT}[main]`,
    `[1:a]${AUDIO_FORMAT},asplit=${count}${splitLabels}`,
  ];

  const delayedTags: string[] = [];
  timestamps.forEach((seconds, i) => {
    const delayMs = Math.round(seconds * 1000);
    parts.push(
      `[tag${i}]atrim=0:${tagTrim},asetpts=PTS-STARTPTS,adelay=${delayMs}|${delayMs},volume=${WATERMARK_TAG_VOLUME}[d${i}]`,
    );
    delayedTags.push(`[d${i}]`);
  });

  parts.push(
    `[main]${delayedTags.join("")}amix=inputs=${count + 1}:duration=first:dropout_transition=0:normalize=0,alimiter=limit=0.98[out]`,
  );

  return parts.join(";");
}

export async function generateWatermarkedPreview(
  mp3Buffer: Buffer,
  watermarkPath: string,
): Promise<Buffer> {
  const ffmpegExecutable = resolveFfmpegExecutable();

  try {
    accessSync(watermarkPath, constants.R_OK);
  } catch {
    throw new Error("Watermark tag audio file missing");
  }

  const tempDir = join(tmpdir(), `leskud-preview-${Date.now()}`);
  mkdirSync(tempDir, { recursive: true });

  const inputPath = join(tempDir, "input.mp3");
  const outputPath = join(tempDir, "preview.mp3");

  try {
    writeFileSync(inputPath, mp3Buffer);

    const durationSeconds = await getAudioDurationSeconds(inputPath);
    const tagDurationSeconds =
      await getWatermarkTagDurationSeconds(watermarkPath);
    const filter = buildWatermarkFilter(durationSeconds, tagDurationSeconds);

    await execFileAsync(
      ffmpegExecutable,
      [
        "-y",
        "-i",
        inputPath,
        "-i",
        watermarkPath,
        "-filter_complex",
        filter,
        "-map",
        "[out]",
        "-codec:a",
        "libmp3lame",
        "-b:a",
        "192k",
        outputPath,
      ],
      {
        timeout: 90_000,
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    return readFileSync(outputPath);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

export function getWatermarkTagPath(): string {
  return join(process.cwd(), "assets", "audio", "watermark-tag.wav");
}
