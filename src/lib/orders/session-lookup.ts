import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import {
  buildPurchaseItemViews,
  type PurchaseItemView,
} from "@/lib/orders/purchase-display";
import { loadBeatLicensesForItems } from "@/lib/orders/license-access";
import type { Order, OrderItem } from "@/types/database";

export async function getPaidOrderItemsBySessionId(
  sessionId: string,
): Promise<{
  order: Order;
  items: OrderItem[];
  purchaseItems: PurchaseItemView[];
} | null> {
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .eq("status", "paid")
    .maybeSingle();

  if (!order) return null;

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order.id)
    .order("created_at", { ascending: false });

  const orderItems = (items as OrderItem[]) ?? [];
  const beatIds = [...new Set(orderItems.map((item) => item.beat_id))];
  const beatLicensesByBeatId = await loadBeatLicensesForItems(beatIds);

  return {
    order: order as Order,
    items: orderItems,
    purchaseItems: buildPurchaseItemViews(orderItems, beatLicensesByBeatId),
  };
}
