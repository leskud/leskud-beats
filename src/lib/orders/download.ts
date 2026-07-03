import "server-only";
import {
  LICENSE_LABELS,
  SIGNED_URL_EXPIRY_SECONDS,
  STORAGE_BUCKETS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

type DownloadAccessParams = {
  orderItemId: string;
  sessionId?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  beat_id: string;
  license_type: string;
  beat_title: string;
  download_count: number;
  max_downloads: number;
  beat_license_id: string;
  orders: {
    id: string;
    email: string;
    status: string;
    stripe_checkout_session_id: string | null;
    user_id: string | null;
  };
};

export type PaidDownloadResult =
  | { success: true; signedUrl: string; filename: string; remaining: number }
  | { success: false; error: string; status: number };

function normalizeOrderItemRow(item: Record<string, unknown>): OrderItemRow {
  const orders = item.orders as OrderItemRow["orders"] | OrderItemRow["orders"][];
  const order = Array.isArray(orders) ? orders[0] : orders;

  return {
    ...(item as Omit<OrderItemRow, "orders">),
    orders: order,
  };
}

async function loadOrderItem(
  orderItemId: string,
  sessionId?: string | null,
): Promise<{ item: OrderItemRow | null; denied: boolean }> {
  const selectQuery =
    "id, order_id, beat_id, license_type, beat_title, download_count, max_downloads, beat_license_id, orders!inner(id, email, status, stripe_checkout_session_id, user_id)";

  if (sessionId) {
    const service = createServiceClient();
    const { data: item } = await service
      .from("order_items")
      .select(selectQuery)
      .eq("id", orderItemId)
      .maybeSingle();

    if (!item) return { item: null, denied: false };

    const row = normalizeOrderItemRow(item as Record<string, unknown>);
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

  const row = normalizeOrderItemRow(item as Record<string, unknown>);
  const ownsOrder =
    row.orders.user_id === user.id ||
    row.orders.email.toLowerCase() === user.email?.toLowerCase();

  if (!ownsOrder) {
    return { item: null, denied: true };
  }

  return { item: row, denied: false };
}

export async function createPaidDownload(
  params: DownloadAccessParams,
): Promise<PaidDownloadResult> {
  const { item, denied } = await loadOrderItem(
    params.orderItemId,
    params.sessionId,
  );

  if (denied) {
    return { success: false, error: "Accès refusé.", status: 403 };
  }

  if (!item) {
    return { success: false, error: "Achat introuvable.", status: 404 };
  }

  if (item.orders.status !== "paid") {
    return { success: false, error: "Commande non payée.", status: 403 };
  }

  if (item.download_count >= item.max_downloads) {
    return {
      success: false,
      error: "Limite de téléchargements atteinte (5 max).",
      status: 403,
    };
  }

  const service = createServiceClient();

  const { data: license } = await service
    .from("beat_licenses")
    .select("storage_path")
    .eq("id", item.beat_license_id)
    .single();

  if (!license?.storage_path?.trim()) {
    return { success: false, error: "Fichier indisponible.", status: 404 };
  }

  const { data: incrementRows, error: incrementError } = await service.rpc(
    "increment_order_item_download",
    { p_order_item_id: params.orderItemId },
  );

  const increment = incrementRows?.[0] as
    | { ok: boolean; download_count: number; max_downloads: number }
    | undefined;

  if (incrementError || !increment?.ok) {
    return {
      success: false,
      error: "Limite de téléchargements atteinte (5 max).",
      status: 403,
    };
  }

  const { data: signed, error: signError } = await service.storage
    .from(STORAGE_BUCKETS.beats)
    .createSignedUrl(license.storage_path, SIGNED_URL_EXPIRY_SECONDS);

  if (signError || !signed?.signedUrl) {
    return {
      success: false,
      error: "Impossible de générer le lien de téléchargement.",
      status: 500,
    };
  }

  const ext = license.storage_path.split(".").pop()?.toLowerCase() ?? "file";
  const slug = item.beat_title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const label =
    LICENSE_LABELS[item.license_type as keyof typeof LICENSE_LABELS] ??
    item.license_type;
  const filename = `${slug}-${label}.${ext}`;

  return {
    success: true,
    signedUrl: signed.signedUrl,
    filename,
    remaining: increment.max_downloads - increment.download_count,
  };
}
