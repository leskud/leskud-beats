import { createClient } from "@/lib/supabase/server";
import type { BeatWithLicenses } from "@/types/database";

export async function getBeatByIdAdmin(
  beatId: string,
): Promise<BeatWithLicenses | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("beats")
    .select("*, beat_licenses(*)")
    .eq("id", beatId)
    .maybeSingle();

  return data as BeatWithLicenses | null;
}
