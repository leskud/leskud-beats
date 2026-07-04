import Link from "next/link";
import { CONTACT_EMAIL, LICENSE_LABELS, PRODUCER_NAME } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import { PROPERTY_NOTICE } from "@/lib/legal/license-definitions";
import { LICENSE_VERSION } from "@/lib/legal/versions";
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
  const effectiveDate = purchaseDate;

  return (
    <div className="license-certificate mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 print:mb-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold">LeSkud Beats</p>
          <h1 className="mt-2 text-3xl font-semibold">Certificat de licence</h1>
          <p className="mt-2 text-sm text-muted">
            Document récapitulatif de ta licence d&apos;utilisation.
          </p>
          <p className="mt-1 text-xs text-muted">Version licence : {LICENSE_VERSION}</p>
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
            Parties
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Producteur / Concédant</dt>
              <dd className="font-medium">{PRODUCER_NAME}</dd>
            </div>
            <div>
              <dt className="text-muted">Email producteur</dt>
              <dd>{CONTACT_EMAIL}</dd>
            </div>
            <div>
              <dt className="text-muted">Client / Licencié</dt>
              <dd>{order.email}</dd>
            </div>
            <div>
              <dt className="text-muted">Date d&apos;effet</dt>
              <dd>
                {new Date(effectiveDate).toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          </dl>
        </section>

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
              <dt className="text-muted">Prix payé TTC</dt>
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
            Acceptation enregistrée
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">CGV (version)</dt>
              <dd>{order.terms_version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Licence (version)</dt>
              <dd>{order.license_version ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">CGV acceptées le</dt>
              <dd>
                {order.accepted_terms_at
                  ? new Date(order.accepted_terms_at).toLocaleString("fr-FR")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Accès immédiat accepté le</dt>
              <dd>
                {order.accepted_license_at
                  ? new Date(order.accepted_license_at).toLocaleString("fr-FR")
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Fichiers inclus
          </h2>
          <p className="mt-3 text-sm text-muted">
            {files.map((file) => file.label).join(" · ") || "—"}
          </p>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Droits accordés
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {definition.rights.map((right) => (
              <li key={right}>· {right}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Limites & restrictions
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {[...definition.limits, ...definition.restrictions].map((item) => (
              <li key={item}>· {item}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Crédit obligatoire
          </h2>
          <p className="mt-3 text-sm font-medium text-gold">
            {definition.credit}
          </p>
          <p className="mt-1 text-sm text-muted">
            À afficher sur les plateformes de diffusion lorsque c&apos;est possible.
          </p>
        </section>

        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-gold">
            Propriété
          </h2>
          <ul className="mt-3 space-y-1.5 text-sm text-muted">
            {PROPERTY_NOTICE.map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>
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
