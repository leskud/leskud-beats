import "server-only";
import {
  LICENSE_LABELS,
  STORAGE_BUCKETS,
  type LicenseType,
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
  | {
      success: true;
      buffer: Buffer;
      filename: string;
      contentType: string;
    }
  | { success: false; error: string; status: number };

function normalizeOrderItemRow(item: Record<string, unknown>): OrderItemRow {
  const orders = item.orders as OrderItemRow["orders"] | OrderItemRow["orders"][];
  const order = Array.isArray(orders) ? orders[0] : orders;

  return {
    ...(item as Omit<OrderItemRow, "orders">),
    orders: order,
  };
}

export function buildPaidDownloadFilename(
  beatTitle: string,
  licenseType: LicenseType,
  storagePath: string,
): string {
  const slug =
    beatTitle
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]+/g, "") || "beat";
  const label = LICENSE_LABELS[licenseType];
  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "file";
  return `LeSkud-${slug}-${label}.${ext}`;
}

function contentTypeForPath(storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  if (ext === "zip") return "application/zip";
  return "application/octet-stream";
}

async function loadOrderItem(
  orderItemId: string,
  sessionId?: string | null,
): Promise<{ item: OrderItemRow | null; denied: boolean }> {
  const selectQuery =
    "id, order_id, beat_id, license_type, beat_title, download_count, beat_license_id, orders!inner(id, email, status, stripe_checkout_session_id, user_id)";

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

  const service = createServiceClient();

  const { data: license } = await service
    .from("beat_licenses")
    .select("storage_path")
    .eq("id", item.beat_license_id)
    .single();

  if (!license?.storage_path?.trim()) {
    return { success: false, error: "Fichier indisponible.", status: 404 };
  }

  const { data: file, error: downloadError } = await service.storage
    .from(STORAGE_BUCKETS.beats)
    .download(license.storage_path);

  if (downloadError || !file) {
    return { success: false, error: "Fichier introuvable.", status: 404 };
  }

  await service
    .from("order_items")
    .update({ download_count: item.download_count + 1 })
    .eq("id", params.orderItemId);

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = buildPaidDownloadFilename(
    item.beat_title,
    item.license_type as LicenseType,
    license.storage_path,
  );

  return {
    success: true,
    buffer,
    filename,
    contentType: contentTypeForPath(license.storage_path),
  };
}
