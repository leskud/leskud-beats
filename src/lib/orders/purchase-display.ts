import type { LicenseType } from "@/lib/constants";
import {
  DOWNLOAD_FILE_LABELS,
  getEntitledFileTypes,
  type DownloadFileType,
} from "@/lib/orders/download-entitlements";
import type { BeatLicense, OrderItem } from "@/types/database";

export type PurchaseDownloadFile = {
  fileType: DownloadFileType;
  label: string;
};

export type PurchaseItemView = {
  orderItem: OrderItem;
  files: PurchaseDownloadFile[];
};

export function buildPurchaseItemViews(
  items: OrderItem[],
  beatLicensesByBeatId: Map<
    string,
    Pick<BeatLicense, "license_type" | "storage_path">[]
  >,
): PurchaseItemView[] {
  return items.map((orderItem) => {
    const beatLicenses = beatLicensesByBeatId.get(orderItem.beat_id) ?? [];
    const entitled = getEntitledFileTypes(
      orderItem.license_type as LicenseType,
      beatLicenses,
    );

    return {
      orderItem,
      files: entitled.map((fileType) => ({
        fileType,
        label: DOWNLOAD_FILE_LABELS[fileType],
      })),
    };
  });
}

export function buildDownloadHref(
  orderItemId: string,
  fileType: DownloadFileType,
  sessionId?: string | null,
): string {
  const params = new URLSearchParams({ orderItemId, fileType });
  if (sessionId) params.set("sessionId", sessionId);
  return `/api/orders/download?${params.toString()}`;
}

export function buildLicenseHref(
  orderItemId: string,
  sessionId?: string | null,
): string {
  const params = sessionId ? `?sessionId=${encodeURIComponent(sessionId)}` : "";
  return `/account/licenses/${orderItemId}${params}`;
}
