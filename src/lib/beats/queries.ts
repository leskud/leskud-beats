import { createClient } from "@/lib/supabase/server";
import type { Beat, BeatWithLicenses } from "@/types/database";

export async function getPublishedBeats(): Promise<BeatWithLicenses[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("beats")
    .select("*, beat_licenses(*)")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (data as BeatWithLicenses[]) ?? [];
}

export async function getFeaturedBeat(): Promise<BeatWithLicenses | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("beats")
    .select("*, beat_licenses(*)")
    .eq("status", "published")
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data as BeatWithLicenses | null;
}

export async function getBeatBySlug(
  slug: string,
): Promise<BeatWithLicenses | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("beats")
    .select("*, beat_licenses(*)")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  return data as BeatWithLicenses | null;
}

export async function getPublishedBeatById(
  id: string,
): Promise<Pick<Beat, "id" | "slug" | "title" | "preview_path"> | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("beats")
    .select("id, slug, title, preview_path")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  return data;
}
