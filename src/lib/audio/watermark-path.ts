import "server-only";
import {
  accessSync,
  constants,
  copyFileSync,
  existsSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { previewLog } from "@/lib/audio/preview-log";

const TMP_WATERMARK_NAME = "leskud-watermark-tag.wav";

let cachedWatermarkPath: string | null = null;

function listWatermarkCandidates(): string[] {
  const cwd = process.cwd();
  return [
    join(cwd, "assets", "audio", "watermark-tag.wav"),
    join(cwd, "public", "audio", "watermark-tag.wav"),
  ];
}

function copyWatermarkToTmp(sourcePath: string): string {
  const tempPath = join(tmpdir(), TMP_WATERMARK_NAME);
  copyFileSync(sourcePath, tempPath);
  previewLog("watermark_copied_to_tmp", {
    source: sourcePath,
    watermark_path: tempPath,
    watermark_size: statSync(tempPath).size,
  });
  return tempPath;
}

export function getWatermarkDiagnostics(): Record<string, unknown> {
  const candidates = listWatermarkCandidates().map((path) => ({
    path,
    exists: existsSync(path),
    size: existsSync(path) ? statSync(path).size : null,
  }));

  return {
    cwd: process.cwd(),
    watermark_candidates: candidates,
    cached_watermark_path: cachedWatermarkPath,
    tmpdir: tmpdir(),
  };
}

export function resolveWatermarkTagPath(): string {
  if (cachedWatermarkPath && existsSync(cachedWatermarkPath)) {
    previewLog("watermark_cache_hit", {
      watermark_path: cachedWatermarkPath,
      watermark_exists: true,
    });
    return cachedWatermarkPath;
  }

  const candidates = listWatermarkCandidates();
  const sourcePath = candidates.find((path) => existsSync(path));

  previewLog("watermark_resolve_start", {
    ...getWatermarkDiagnostics(),
    watermark_exists: Boolean(sourcePath),
  });

  if (!sourcePath) {
    throw new Error("Watermark tag audio file missing");
  }

  try {
    accessSync(sourcePath, constants.R_OK);
  } catch {
    throw new Error("Watermark tag audio file not readable");
  }

  if (process.env.VERCEL === "1") {
    cachedWatermarkPath = copyWatermarkToTmp(sourcePath);
    return cachedWatermarkPath;
  }

  cachedWatermarkPath = sourcePath;
  previewLog("watermark_resolve_bundled", {
    watermark_path: sourcePath,
    watermark_exists: true,
    watermark_size: statSync(sourcePath).size,
  });
  return sourcePath;
}

/** @deprecated Utiliser resolveWatermarkTagPath() */
export function getWatermarkTagPath(): string {
  return resolveWatermarkTagPath();
}
