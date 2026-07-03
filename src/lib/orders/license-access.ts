import "server-only";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import { getLicenseDefinition } from "@/lib/legal/license-definitions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { BeatLicense, Order, OrderItem } from "@/types/database";

type OrderItemRow = OrderItem & {
  orders: Order;
};

export type LicenseCertificateData = {
  orderItem: OrderItem;
  order: Order;
  definition: NonNullable<ReturnType<typeof getLicenseDefinition>>;
};

function normalizeOrderRow(item: Record<string, unknown>): OrderItemRow {
  const orders = item.orders as Order | Order[];
  const order = Array.isArray(orders) ? orders[0] : orders;
  return {
    ...(item as OrderItem),
    orders: order,
  };
}

async function loadOrderItemRow(
  orderItemId: string,
  sessionId?: string | null,
): Promise<{ item: OrderItemRow | null; denied: boolean }> {
  const selectQuery = "*, orders!inner(*)";

  if (sessionId) {
    const service = createServiceClient();
    const { data: item } = await service
      .from("order_items")
      .select(selectQuery)
      .eq("id", orderItemId)
      .maybeSingle();

    if (!item) return { item: null, denied: false };

    const row = normalizeOrderRow(item as Record<string, unknown>);
    if (row.orders.stripe_checkout_session_id !== sessionId) {
      return { item: null, denied: true };
    }

    return { item: row, denied: false };
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return { item: null, denied: true };
  }

  const { data: item } = await userClient
    .from("order_items")
    .select(selectQuery)
    .eq("id", orderItemId)
    .maybeSingle();

  if (!item) return { item: null, denied: false };

  const row = normalizeOrderRow(item as Record<string, unknown>);
  const ownsOrder =
    row.orders.user_id === user.id ||
    row.orders.email.toLowerCase() === user.email?.toLowerCase();

  if (!ownsOrder) {
    return { item: null, denied: true };
  }

  return { item: row, denied: false };
}

export async function getLicenseCertificateData(
  orderItemId: string,
  sessionId?: string | null,
): Promise<
  | { success: true; data: LicenseCertificateData }
  | { success: false; error: string; status: number }
> {
  const { item, denied } = await loadOrderItemRow(orderItemId, sessionId);

  if (denied) {
    return { success: false, error: "Accès refusé.", status: 403 };
  }

  if (!item) {
    return { success: false, error: "Licence introuvable.", status: 404 };
  }

  if (item.orders.status !== "paid") {
    return { success: false, error: "Commande non payée.", status: 403 };
  }

  const definition = getLicenseDefinition(item.license_type as LicenseType);

  if (!definition) {
    return { success: false, error: "Type de licence inconnu.", status: 404 };
  }

  return {
    success: true,
    data: {
      orderItem: item,
      order: item.orders,
      definition,
    },
  };
}

export async function loadBeatLicensesForItems(
  beatIds: string[],
): Promise<Map<string, Pick<BeatLicense, "license_type" | "storage_path">[]>> {
  if (beatIds.length === 0) return new Map();

  const service = createServiceClient();
  const { data } = await service
    .from("beat_licenses")
    .select("beat_id, license_type, storage_path")
    .in("beat_id", beatIds);

  const map = new Map<string, Pick<BeatLicense, "license_type" | "storage_path">[]>();

  for (const row of data ?? []) {
    const list = map.get(row.beat_id) ?? [];
    list.push({
      license_type: row.license_type,
      storage_path: row.storage_path,
    });
    map.set(row.beat_id, list);
  }

  return map;
}

export function formatLicenseTypeLabel(licenseType: LicenseType): string {
  return LICENSE_LABELS[licenseType];
}
