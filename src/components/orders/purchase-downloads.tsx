"use client";

import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import type { OrderItem } from "@/types/database";
import { formatPrice } from "@/lib/utils";

type PurchaseDownloadsProps = {
  items: OrderItem[];
  sessionId?: string | null;
};

function buildDownloadHref(
  orderItemId: string,
  sessionId?: string | null,
): string {
  const params = new URLSearchParams({ orderItemId });
  if (sessionId) params.set("sessionId", sessionId);
  return `/api/orders/download?${params.toString()}`;
}

export function PurchaseDownloads({
  items,
  sessionId,
}: PurchaseDownloadsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Aucun achat pour le moment.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-medium">{item.beat_title}</p>
            <p className="mt-1 text-sm text-muted">
              {LICENSE_LABELS[item.license_type as LicenseType]} ·{" "}
              {formatPrice(item.price_cents)}
            </p>
          </div>
          <a
            href={buildDownloadHref(item.id, sessionId)}
            className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-surface-elevated"
          >
            Télécharger
          </a>
        </li>
      ))}
    </ul>
  );
}
