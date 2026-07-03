import type { LICENSE_TYPES } from "@/lib/constants";

export type LicenseType = (typeof LICENSE_TYPES)[number];

export type BeatStatus = "draft" | "published" | "sold_exclusive";
export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export type BeatFilters = {
  genre?: string;
  mood?: string;
  musicalKey?: string;
  bpmMin?: number;
  bpmMax?: number;
  priceMin?: number;
  priceMax?: number;
  sort?: "newest" | "price_asc" | "price_desc";
};
