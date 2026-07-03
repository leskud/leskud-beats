import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import type { OrderItem } from "@/types/database";

export async function getPaidOrderItemsBySessionId(
  sessionId: string,
): Promise<{
  order: { id: string; email: string };
  items: OrderItem[];
} | null> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, email, status")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "paid")
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  return {
    order: { id: order.id, email: order.email },
    items: (items as OrderItem[]) ?? [],
  };
}
