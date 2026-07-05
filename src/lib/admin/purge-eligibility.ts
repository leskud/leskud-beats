import type { BeatStatus } from "@/types";

const TEST_BEAT_SLUGS = new Set([
  "test1",
  "test2",
  "zeldatest",
  "zeldabeat",
]);

export function isTestBeatSlug(slug: string): boolean {
  const normalized = slug.trim().toLowerCase();
  if (TEST_BEAT_SLUGS.has(normalized)) return true;
  return normalized.startsWith("test");
}

export function canPurgeBeat(beat: {
  status: BeatStatus;
  slug: string;
}): boolean {
  if (beat.status === "sold_exclusive") return false;
  if (beat.status === "draft") return true;
  return isTestBeatSlug(beat.slug);
}
