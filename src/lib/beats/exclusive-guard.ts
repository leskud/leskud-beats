import "server-only";
import { EXCLUSIVE_SOLD_MESSAGE } from "@/lib/beats/exclusive-messages";
import { createServiceClient } from "@/lib/supabase/service";
import type { BeatStatus } from "@/types";

export { EXCLUSIVE_SOLD_MESSAGE };

export function isExclusivePurchaseBlocked(
  beatStatus: string | BeatStatus,
  exclusiveAlreadySold: boolean,
): boolean {
  return beatStatus === "sold_exclusive" || exclusiveAlreadySold;
}

export async function hasPaidExclusiveOrderForBeat(
  beatId: string,
): Promise<boolean> {
  const supabase = createServiceClient();

  const { count, error } = await supabase
    .from("order_items")
    .select("id, orders!inner(status)", { count: "exact", head: true })
    .eq("beat_id", beatId)
    .eq("license_type", "exclusive")
    .eq("orders.status", "paid");

  if (error) {
    console.error(
      "[exclusive-guard] paid_exclusive_lookup_failed",
      JSON.stringify({ beatId, error: error.message }),
    );
    return false;
  }

  return (count ?? 0) > 0;
}

export async function getExclusivePurchaseBlockState(
  beatId: string,
  beatStatus: string | BeatStatus,
): Promise<{ blocked: boolean; exclusiveAlreadySold: boolean }> {
  const exclusiveAlreadySold = await hasPaidExclusiveOrderForBeat(beatId);
  return {
    exclusiveAlreadySold,
    blocked: isExclusivePurchaseBlocked(beatStatus, exclusiveAlreadySold),
  };
}
