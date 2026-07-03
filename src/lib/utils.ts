import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { LicenseType } from "@/lib/constants";
import { DEFAULT_LICENSE_PRICES } from "@/lib/constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getDefaultPriceCents(licenseType: LicenseType): number {
  return DEFAULT_LICENSE_PRICES[licenseType];
}

export function getPublicStorageUrl(
  bucket: string,
  path: string,
  cacheKey?: string,
): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const url = `${base}/storage/v1/object/public/${bucket}/${path}`;
  if (!cacheKey) return url;
  return `${url}?v=${encodeURIComponent(cacheKey)}`;
}
