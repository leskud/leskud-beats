"use client";

import Link from "next/link";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import type { LicenseCertificateData } from "@/lib/orders/license-access";
import {
  buildDownloadHref,
} from "@/lib/orders/purchase-display";
import type { DownloadFileType } from "@/lib/orders/download-entitlements";
import { formatPrice } from "@/lib/utils";

type LicenseCertificateProps = {
  data: LicenseCertificateData;
  files: { fileType: DownloadFileType; label: string }[];
  sessionId?: string | null;
};

export function LicenseCertificate({
  data,
  files,
  sessionId,
}: LicenseCertificateProps) {
  const { orderItem, order, definition } = data;
  const purchaseDate = order.paid_at ?? order.created_at;

  return (
    <div className="license-certificate mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 print:mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold">LeSkud Beats</p>
          <h1 className="mt-2 text-3xl font-semibold">Certificat de licence</h1>
          <p className="mt-2 text-sm text-muted">
            Document récapitulatif de ta licence d&apos;utilisation.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-gold/40 px-4 py-2 text-sm text-gold transition-colors hover:bg-gold/10 print:hidden"
        >
          Imprimer / Enregistrer en PDF
        </button>
      </div>

      <div className="space-y-6 rounded-xl border border-border bg-surface p-6">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Achat
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Beat</dt>
              <dd className="font-medium">{orderItem.beat_title}</dd>
            </div>
            <div>
              <dt className="text-muted">Licence</dt>
              <dd className="font-medium">
                {LICENSE_LABELS[orderItem.license_type as LicenseType]}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Acheteur</dt>
              <dd>{order.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Date d&apos;achat</dt>
              <dd>
                {new Date(purchaseDate).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Prix payé</dt>
              <dd>{formatPrice(orderItem.price_cents)}</dd>
            </div>
            <div>
              <dt className="text-muted">Référence commande</dt>
              <dd className="break-all font-mono text-xs">
                {order.stripe_checkout_session_id ?? order.id}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Versions acceptées
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">CGV</dt>
              <dd>{order.terms_version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Licences</dt>
              <dd>{order.license_version ?? "—"}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Conditions de la licence
          </h2>
          <p className="mt-3 text-sm text-muted">
            Fichiers inclus : {files.map((file) => file.label).join(" · ")}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <ul className="space-y-1.5 text-sm text-muted">
              {definition.rights.map((right) => (
                <li key={right}>· {right}</li>
              ))}
            </ul>
            <ul className="space-y-1.5 text-sm text-muted">
              {[...definition.limits, ...definition.restrictions].map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </div>
          <p className="mt-4 text-sm font-medium text-gold">
            Crédit producteur : Prod. LeSkud
          </p>
        </section>

        {files.length > 0 ? (
          <section className="print:hidden">
            <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
              Téléchargements
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((file) => (
                <a
                  key={file.fileType}
                  href={buildDownloadHref(
                    orderItem.id,
                    file.fileType,
                    sessionId,
                  )}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-xs transition-colors hover:border-gold/50 hover:text-gold"
                >
                  Télécharger {file.label}
                </a>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <Link
        href="/account"
        className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline print:hidden"
      >
        ← Retour à mes achats
      </Link>
    </div>
  );
}
