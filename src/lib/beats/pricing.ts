import type { BeatLicense } from "@/types/database";

export function getStartingPriceCents(licenses: BeatLicense[]): number | null {
  const available = licenses.filter(
    (l) => l.is_available && Boolean(l.storage_path?.trim()),
  );
  if (available.length === 0) return null;
  return Math.min(...available.map((l) => l.price_cents));
}
