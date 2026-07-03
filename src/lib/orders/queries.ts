import { createClient } from "@/lib/supabase/server";
import { loadBeatLicensesForItems } from "@/lib/orders/license-access";
import {
  buildPurchaseItemViews,
  type PurchaseItemView,
} from "@/lib/orders/purchase-display";
import type { OrderItem, OrderWithItems } from "@/types/database";

export async function getUserOrdersWithItems(): Promise<OrderWithItems[]> {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  if (!orders?.length) return [];

  const orderIds = orders.map((o) => o.id);
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: false });

  const itemsByOrder = new Map<string, OrderItem[]>();
  for (const item of items ?? []) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item as OrderItem);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
    ...(order as OrderWithItems),
    order_items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function getAccountPurchaseItems(): Promise<PurchaseItemView[]> {
  const orders = await getUserOrdersWithItems();
  const items = orders.flatMap((order) => order.order_items);
  const beatIds = [...new Set(items.map((item) => item.beat_id))];
  const beatLicensesByBeatId = await loadBeatLicensesForItems(beatIds);
  return buildPurchaseItemViews(items, beatLicensesByBeatId);
}
