import { createClient } from "@supabase/supabase-js";
import {
  getSupabasePublicConfig,
  getSupabaseServiceRoleKey,
} from "@/lib/config/env";

export function createServiceClient() {
  const { url } = getSupabasePublicConfig();
  const key = getSupabaseServiceRoleKey();

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
