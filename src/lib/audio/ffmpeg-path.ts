import "server-only";
import {
  accessSync,
  chmodSync,
  constants,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegStaticPath from "ffmpeg-static";
import { previewLog } from "@/lib/audio/preview-log";
import { isPreviewGenerationEnabled } from "@/lib/config/env";

const CACHED_FFMPEG_NAME = "leskud-ffmpeg";

let cachedExecutablePath: string | null = null;

function isVercelRuntime(): boolean {
  return process.env.VERCEL === "1";
}

function canExecute(filePath: string): boolean {
  try {
    accessSync(filePath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function fileStat(path: string): { exists: boolean; size: number | null } {
  try {
    const stat = statSync(path);
    return { exists: true, size: stat.size };
  } catch {
    return { exists: false, size: null };
  }
}

function listFfmpegCandidates(): string[] {
  const candidates = new Set<string>();

  if (ffmpegStaticPath) candidates.add(ffmpegStaticPath);
  if (process.env.FFMPEG_BIN) candidates.add(process.env.FFMPEG_BIN);

  const cwd = process.cwd();
  candidates.add(join(cwd, "node_modules", "ffmpeg-static", "ffmpeg"));
  candidates.add(join(cwd, "node_modules", "ffmpeg-static", "ffmpeg.exe"));

  return [...candidates];
}

function copyToTmpExecutable(sourcePath: string): string {
  const tempBinary = join(tmpdir(), CACHED_FFMPEG_NAME);

  if (existsSync(tempBinary) && canExecute(tempBinary)) {
    previewLog("ffmpeg_tmp_cache_hit", { ffmpeg_path_resolved: tempBinary });
    return tempBinary;
  }

  copyFileSync(sourcePath, tempBinary);
  chmodSync(tempBinary, 0o755);
  previewLog("ffmpeg_copied_to_tmp", {
    source: sourcePath,
    ffmpeg_path_resolved: tempBinary,
    tmp_size: fileStat(tempBinary).size,
  });
  return tempBinary;
}

export function getFfmpegDiagnostics(): Record<string, unknown> {
  const candidates = listFfmpegCandidates().map((path) => ({
    path,
    ...fileStat(path),
    executable: existsSync(path) ? canExecute(path) : false,
  }));

  return {
    preview_enabled: isPreviewGenerationEnabled(),
    preview_generation_env: process.env.PREVIEW_GENERATION_ENABLED ?? null,
    vercel: isVercelRuntime(),
    cwd: process.cwd(),
    ffmpeg_static_import: ffmpegStaticPath,
    ffmpeg_candidates: candidates,
    cached_ffmpeg_path: cachedExecutablePath,
    tmpdir: tmpdir(),
  };
}

/**
 * Résout le binaire FFmpeg pour les fonctions serverless Vercel.
 * Sur Vercel, copie toujours vers /tmp (filesystem read-only + ENOENT fréquent).
 */
export function resolveFfmpegExecutable(): string {
  if (cachedExecutablePath && existsSync(cachedExecutablePath)) {
    previewLog("ffmpeg_cache_hit", {
      ffmpeg_path_resolved: cachedExecutablePath,
      ffmpeg_exists: true,
    });
    return cachedExecutablePath;
  }

  const candidates = listFfmpegCandidates();
  const bundledPath = candidates.find((path) => existsSync(path));

  previewLog("ffmpeg_resolve_start", {
    ...getFfmpegDiagnostics(),
    ffmpeg_exists: Boolean(bundledPath),
  });

  if (!bundledPath) {
    throw new Error("FFmpeg binary not found in deployment");
  }

  if (isVercelRuntime() || !canExecute(bundledPath)) {
    cachedExecutablePath = copyToTmpExecutable(bundledPath);
    return cachedExecutablePath;
  }

  cachedExecutablePath = bundledPath;
  previewLog("ffmpeg_resolve_bundled", {
    ffmpeg_path_resolved: bundledPath,
    ffmpeg_exists: true,
  });
  return bundledPath;
}
