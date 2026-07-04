import "server-only";
import {
  accessSync,
  chmodSync,
  constants,
  copyFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegStaticPath from "ffmpeg-static";

const CACHED_FFMPEG_NAME = "leskud-ffmpeg";

let cachedExecutablePath: string | null = null;

function canExecute(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function copyToTmpExecutable(sourcePath: string): string {
  const tempBinary = join(tmpdir(), CACHED_FFMPEG_NAME);

  if (existsSync(tempBinary) && canExecute(tempBinary)) {
    return tempBinary;
  }

  copyFileSync(sourcePath, tempBinary);
  chmodSync(tempBinary, 0o755);
  return tempBinary;
}

/**
 * Résout le binaire FFmpeg pour les fonctions serverless Vercel.
 * Copie vers /tmp si le binaire bundlé n'est pas exécutable (filesystem read-only).
 */
export function resolveFfmpegExecutable(): string {
  if (cachedExecutablePath && existsSync(cachedExecutablePath)) {
    return cachedExecutablePath;
  }

  if (!ffmpegStaticPath) {
    throw new Error("FFmpeg binary path unavailable");
  }

  if (!existsSync(ffmpegStaticPath)) {
    throw new Error("FFmpeg binary not found in deployment");
  }

  if (canExecute(ffmpegStaticPath)) {
    cachedExecutablePath = ffmpegStaticPath;
    return ffmpegStaticPath;
  }

  cachedExecutablePath = copyToTmpExecutable(ffmpegStaticPath);
  return cachedExecutablePath;
}
