import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ffmpegPath = (await import("ffmpeg-static")).default;
const watermarkPath = join(process.cwd(), "assets", "audio", "watermark-tag.wav");

let failed = false;

if (!ffmpegPath || !existsSync(ffmpegPath)) {
  console.error("[verify-ffmpeg] FFmpeg binary missing:", ffmpegPath);
  failed = true;
} else {
  const size = statSync(ffmpegPath).size;
  console.info("[verify-ffmpeg] OK", ffmpegPath, `(${Math.round(size / 1024 / 1024)} Mo)`);
}

if (!existsSync(watermarkPath)) {
  console.error("[verify-ffmpeg] Watermark missing:", watermarkPath);
  failed = true;
} else {
  console.info("[verify-ffmpeg] Watermark OK", watermarkPath);
}

if (failed) {
  process.exit(1);
}
