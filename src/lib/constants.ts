export const BRAND_GOLD = "#c9a962";
export const BRAND_GOLD_MUTED = "#a68b4b";
export const BRAND_GOLD_GLOW = "rgba(201, 169, 98, 0.15)";
export const SITE_NAME = "LeSkud";
export const SITE_DESCRIPTION = "Instrumentales LeSkud — catalogue et licences.";
export const LOGO_PATH = "/logo/leskud.png";
export const YOUTUBE_CHANNEL_URL =
  "https://www.youtube.com/channel/UCUu1QVnQLDuhPoUJJoU06qg";
export const RESEND_TEST_RECIPIENT = "leskud.contact@gmail.com";

export const LICENSE_TYPES = [
  "mp3",
  "wav",
  "stems",
  "unlimited",
  "exclusive",
] as const;
export type LicenseType = (typeof LICENSE_TYPES)[number];

/** Ordre d'affichage grille commerciale */
export const LICENSE_DISPLAY_ORDER: LicenseType[] = [
  "mp3",
  "wav",
  "stems",
  "unlimited",
  "exclusive",
];

export const DEFAULT_LICENSE_PRICES: Record<LicenseType, number> = {
  mp3: 2900,
  wav: 4900,
  stems: 9900,
  unlimited: 14900,
  exclusive: 29900,
};

export const LICENSE_LABELS: Record<LicenseType, string> = {
  mp3: "MP3",
  wav: "Premium WAV",
  stems: "Premium + Stems",
  unlimited: "Unlimited + Stems",
  exclusive: "Exclusive",
};

export const MAX_DOWNLOADS_PER_PURCHASE = 5;
export const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 heure

export const STORAGE_BUCKETS = {
  previews: "previews",
  covers: "covers",
  beats: "beats",
} as const;

export const GENRES = [
  "Trap",
  "Drill",
  "R&B",
  "Afro",
  "Pop",
  "Boom Bap",
  "Lo-Fi",
  "Autre",
] as const;

export const MOODS = [
  "Sombre",
  "Énergique",
  "Mélancolique",
  "Agressif",
  "Chill",
  "Euphorique",
] as const;

export const MUSICAL_KEYS = [
  "C",
  "Cm",
  "C#",
  "C#m",
  "D",
  "Dm",
  "D#",
  "D#m",
  "E",
  "Em",
  "F",
  "Fm",
  "F#",
  "F#m",
  "G",
  "Gm",
  "G#",
  "G#m",
  "A",
  "Am",
  "A#",
  "A#m",
  "B",
  "Bm",
] as const;
