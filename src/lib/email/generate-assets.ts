import fs from "fs";
import path from "path";
import sharp from "sharp";
import { BRAND_GOLD } from "@/lib/constants";

const EMAIL_DIR = path.join(process.cwd(), "public", "email");
const LOGO_PATH = path.join(process.cwd(), "public", "logo", "leskud.png");
const BADGE_PATH = path.join(EMAIL_DIR, "leskud-badge.png");
const YOUTUBE_PATH = path.join(EMAIL_DIR, "youtube.png");

const YOUTUBE_OFFICIAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24">
  <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8z"/>
  <path fill="#FFFFFF" d="M9.75 15.02V8.98L15.5 12l-5.75 3.02z"/>
</svg>`;

export const EMAIL_ASSET_PATHS = {
  badge: BADGE_PATH,
  youtube: YOUTUBE_PATH,
} as const;

async function ensureYoutubeIcon(): Promise<void> {
  if (fs.existsSync(YOUTUBE_PATH)) return;

  await sharp(Buffer.from(YOUTUBE_OFFICIAL_SVG))
    .resize(96, 96, { fit: "contain" })
    .png()
    .toFile(YOUTUBE_PATH);
}

function shouldRegenerateBadge(): boolean {
  if (!fs.existsSync(BADGE_PATH)) return true;
  if (!fs.existsSync(LOGO_PATH)) return false;

  const badgeTime = fs.statSync(BADGE_PATH).mtimeMs;
  const logoTime = fs.statSync(LOGO_PATH).mtimeMs;
  return logoTime > badgeTime;
}

async function createCircularBadge(): Promise<void> {
  if (!shouldRegenerateBadge()) return;

  const size = 120;
  const ring = 3;
  const inner = size - ring * 2;

  const logo = await sharp(LOGO_PATH)
    .resize(Math.round(inner * 0.58), null, { fit: "inside" })
    .png()
    .toBuffer();

  const logoMeta = await sharp(logo).metadata();
  const logoWidth = logoMeta.width ?? inner;
  const logoHeight = logoMeta.height ?? inner;

  const canvas = sharp({
    create: {
      width: inner,
      height: inner,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  });

  const centered = await canvas
    .composite([
      {
        input: logo,
        left: Math.round((inner - logoWidth) / 2),
        top: Math.round((inner - logoHeight) / 2),
      },
    ])
    .png()
    .toBuffer();

  const mask = Buffer.from(
    `<svg width="${inner}" height="${inner}"><circle cx="${inner / 2}" cy="${inner / 2}" r="${inner / 2}" fill="white"/></svg>`,
  );

  const clipped = await sharp(centered)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const frame = Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - ring / 2}" fill="none" stroke="${BRAND_GOLD}" stroke-width="${ring}"/>
    </svg>`,
  );

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: frame, top: 0, left: 0 },
      { input: clipped, top: ring, left: ring },
    ])
    .png()
    .toFile(BADGE_PATH);
}

export async function ensureEmailAssets(): Promise<void> {
  fs.mkdirSync(EMAIL_DIR, { recursive: true });
  await ensureYoutubeIcon();
  await createCircularBadge();
}
