import "server-only";
import {
  STORAGE_BUCKETS,
  type LicenseType,
} from "@/lib/constants";
import {
  DOWNLOAD_FILE_LABELS,
  isEntitledFileType,
  parseDownloadFileType,
  type DownloadFileType,
} from "@/lib/orders/download-entitlements";
import { buildPaidDownloadFilename } from "@/lib/orders/download-filename";
import { createR2PresignedGetUrl } from "@/lib/storage/r2-presign";
import { normalizeStorageProvider } from "@/lib/storage/types";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { BeatLicense } from "@/types/database";

type DownloadAccessParams = {
  orderItemId: string;
  fileType: DownloadFileType;
  sessionId?: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  beat_id: string;
  license_type: string;
  beat_title: string;
  download_count: number;
  orders: {
    id: string;
    email: string;
    status: string;
    stripe_checkout_session_id: string | null;
    user_id: string | null;
  };
  beats: {
    title: string;
    genre: string;
    bpm: number;
    musical_key: string;
  };
};

type BeatLicenseRow = Pick<
  BeatLicense,
  "license_type" | "storage_path" | "storage_provider"
>;

export type PaidDownloadResult =
  | {
      success: true;
      mode: "stream";
      buffer: Buffer;
      filename: string;
      contentType: string;
    }
  | {
      success: true;
      mode: "redirect";
      url: string;
    }
  | { success: false; error: string; status: number };

function normalizeOrderItemRow(item: Record<string, unknown>): OrderItemRow | null {
  const orders = item.orders as OrderItemRow["orders"] | OrderItemRow["orders"][];
  const order = Array.isArray(orders) ? orders[0] : orders;
  const beatsRaw = item.beats as OrderItemRow["beats"] | OrderItemRow["beats"][];
  const beat = Array.isArray(beatsRaw) ? beatsRaw[0] : beatsRaw;

  if (!order?.id || !beat?.title) return null;

  return {
    ...(item as Omit<OrderItemRow, "orders" | "beats">),
    orders: order,
    beats: beat,
  };
}

export function buildLegacyPaidDownloadFilename(
  beatTitle: string,
  fileType: DownloadFileType,
  storagePath: string,
): string {
  const slug =
    beatTitle
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-_]+/g, "") || "beat";
  const label = DOWNLOAD_FILE_LABELS[fileType];
  const ext = storagePath.split(".").pop()?.toLowerCase() ?? "file";
  return `LeSkud-${slug}-${label}.${ext}`;
}

function contentTypeForPath(storagePath: string): string {
  const ext = storagePath.split(".").pop()?.toLowerCase();
  if (ext === "zip") return "application/zip";
  if (ext === "wav") return "audio/wav";
  if (ext === "mp3") return "audio/mpeg";
  return "application/octet-stream";
}

async function loadOrderItem(
  orderItemId: string,
  sessionId?: string | null,
): Promise<{ item: OrderItemRow | null; denied: boolean }> {
  const selectQuery =
    "id, order_id, beat_id, license_type, beat_title, download_count, orders!inner(id, email, status, stripe_checkout_session_id, user_id), beats!inner(title, genre, bpm, musical_key)";

  if (sessionId) {
    const service = createServiceClient();
    const { data: item } = await service
      .from("order_items")
      .select(selectQuery)
      .eq("id", orderItemId)
      .maybeSingle();

    if (!item) return { item: null, denied: false };

    const row = normalizeOrderItemRow(item as Record<string, unknown>);
    if (!row) return { item: null, denied: false };

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
  if (!row) return { item: null, denied: false };

  const ownsOrder =
    row.orders.user_id === user.id ||
    row.orders.email.toLowerCase() === user.email?.toLowerCase();

  if (!ownsOrder) {
    return { item: null, denied: true };
  }

  return { item: row, denied: false };
}

async function loadBeatLicenses(beatId: string): Promise<BeatLicenseRow[]> {
  const service = createServiceClient();
  const { data } = await service
    .from("beat_licenses")
    .select("license_type, storage_path, storage_provider")
    .eq("beat_id", beatId);

  return data ?? [];
}

async function incrementDownloadCount(
  orderItemId: string,
  currentCount: number,
): Promise<void> {
  const service = createServiceClient();
  await service
    .from("order_items")
    .update({ download_count: currentCount + 1 })
    .eq("id", orderItemId);
}

export async function createPaidDownload(
  params: DownloadAccessParams,
): Promise<PaidDownloadResult> {
  const fileType = parseDownloadFileType(params.fileType);
  if (!fileType) {
    return { success: false, error: "Type de fichier invalide.", status: 400 };
  }

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

  const purchasedLicense = item.license_type as LicenseType;
  const beatLicenses = await loadBeatLicenses(item.beat_id);

  if (!isEntitledFileType(purchasedLicense, beatLicenses, fileType)) {
    return {
      success: false,
      error: "Ce fichier n'est pas inclus dans ta licence.",
      status: 403,
    };
  }

  const fileLicense = beatLicenses.find(
    (license) => license.license_type === fileType,
  );

  if (!fileLicense?.storage_path?.trim()) {
    return { success: false, error: "Fichier indisponible.", status: 404 };
  }

  const storageProvider = normalizeStorageProvider(
    fileLicense.storage_provider,
  );
  const filename = buildPaidDownloadFilename({
    genre: item.beats.genre,
    title: item.beats.title || item.beat_title,
    bpm: item.beats.bpm,
    musicalKey: item.beats.musical_key,
    licenseType: purchasedLicense,
    fileType,
    storagePath: fileLicense.storage_path,
  });
  const contentType = contentTypeForPath(fileLicense.storage_path);

  await incrementDownloadCount(params.orderItemId, item.download_count);

  if (storageProvider === "r2") {
    const url = await createR2PresignedGetUrl(
      fileLicense.storage_path,
      filename,
      contentType,
    );

    return {
      success: true,
      mode: "redirect",
      url,
    };
  }

  const service = createServiceClient();
  const { data: file, error: downloadError } = await service.storage
    .from(STORAGE_BUCKETS.beats)
    .download(fileLicense.storage_path);

  if (downloadError || !file) {
    return { success: false, error: "Fichier introuvable.", status: 404 };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return {
    success: true,
    mode: "stream",
    buffer,
    filename,
    contentType,
  };
}
