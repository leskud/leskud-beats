import type { BeatStatus, LicenseType, OrderStatus } from "@/types";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type Beat = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  bpm: number;
  musical_key: string;
  genre: string;
  mood: string;
  tags: string[];
  duration_seconds: number;
  cover_path: string | null;
  preview_path: string | null;
  status: BeatStatus;
  is_featured: boolean;
  producer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type BeatLicense = {
  id: string;
  beat_id: string;
  license_type: LicenseType;
  price_cents: number;
  storage_path: string | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
};

export type BeatWithLicenses = Beat & {
  beat_licenses: BeatLicense[];
};

export type Order = {
  id: string;
  user_id: string | null;
  email: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: OrderStatus;
  total_cents: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  accepted_terms_at: string | null;
  accepted_license_at: string | null;
  terms_version: string | null;
  license_version: string | null;
  buyer_ip: string | null;
  buyer_user_agent: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  beat_id: string;
  beat_license_id: string;
  license_type: LicenseType;
  price_cents: number;
  beat_title: string;
  download_count: number;
  max_downloads: number;
  created_at: string;
};

export type OrderWithItems = Order & {
  order_items: OrderItem[];
};

export type CartItem = {
  id: string;
  user_id: string;
  beat_license_id: string;
  created_at: string;
};

export type Lead = {
  id: string;
  email: string;
  name: string | null;
  marketing_consent: boolean;
  source: string;
  created_at: string;
  last_seen_at: string;
};

export type LeadDownload = {
  id: string;
  lead_id: string;
  beat_id: string;
  downloaded_at: string;
  user_agent: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};
