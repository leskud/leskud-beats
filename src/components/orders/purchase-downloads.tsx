"use client";

import Link from "next/link";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import {
  buildDownloadHref,
  buildLicenseHref,
  type PurchaseItemView,
} from "@/lib/orders/purchase-display";
import { formatPrice } from "@/lib/utils";

type PurchaseDownloadsProps = {
  items: PurchaseItemView[];
  sessionId?: string | null;
};

export function PurchaseDownloads({
  items,
  sessionId,
}: PurchaseDownloadsProps) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">Aucun achat pour le moment.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map(({ orderItem, files }) => (
        <li
          key={orderItem.id}
          className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4"
        >
          <div>
            <p className="font-medium">{orderItem.beat_title}</p>
            <p className="mt-1 text-sm text-muted">
              {LICENSE_LABELS[orderItem.license_type as LicenseType]} ·{" "}
              {formatPrice(orderItem.price_cents)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <a
                  key={file.fileType}
                  href={buildDownloadHref(
                    orderItem.id,
                    file.fileType,
                    sessionId,
                  )}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-surface-elevated"
                >
                  Télécharger {file.label}
                </a>
              ))}
            </div>

            <Link
              href={buildLicenseHref(orderItem.id, sessionId)}
              className="inline-flex h-9 items-center justify-center rounded-md border border-gold/30 px-3 text-xs font-medium text-gold transition-colors hover:bg-gold/10"
            >
              Voir la licence
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
