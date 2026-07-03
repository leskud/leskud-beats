"use client";

import Link from "next/link";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import type { OrderItem } from "@/types/database";
import { Button } from "@/components/ui/button";
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
      {items.map((item) => {
        const remaining = item.max_downloads - item.download_count;
        const exhausted = remaining <= 0;

        return (
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
              <p className="mt-1 text-xs text-muted">
                {exhausted
                  ? "Limite de 5 téléchargements atteinte"
                  : `${remaining} téléchargement${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}`}
              </p>
            </div>
            {exhausted ? (
              <span className="text-xs text-muted">Indisponible</span>
            ) : (
              <Link href={buildDownloadHref(item.id, sessionId)}>
                <Button type="button" variant="outline" className="text-xs">
                  Télécharger
                </Button>
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
