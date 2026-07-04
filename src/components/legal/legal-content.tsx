import Link from "next/link";
import {
  formatLicensePriceDisplay,
  getLicenseDefinition,
  LICENSE_FAQ,
  PROPERTY_NOTICE,
  PUBLIC_LICENSE_DEFINITIONS,
} from "@/lib/legal/license-definitions";
import { CGV_CONTENT, LICENSE_PAGE_INTRO } from "@/lib/legal/terms-content";
import {
  CONFIDENTIALITE_CONTENT,
  MENTIONS_LEGALES_CONTENT,
} from "@/lib/legal/legal-pages-content";
import { LICENSE_VERSION } from "@/lib/legal/versions";
import { PUBLIC_CHECKOUT_LICENSE_TYPES } from "@/lib/constants";

export function LegalDocumentLayout({
  title,
  subtitle,
  version,
  children,
}: {
  title: string;
  subtitle?: string;
  version?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">{title}</h1>
      {subtitle ? <p className="mt-3 text-muted">{subtitle}</p> : null}
      {version ? (
        <p className="mt-2 text-xs text-muted">Version {version}</p>
      ) : null}
      <div className="prose-legal mt-10 space-y-8">{children}</div>
    </div>
  );
}

export function CgvContent() {
  return (
    <LegalDocumentLayout
      title={CGV_CONTENT.title}
      version={CGV_CONTENT.version}
    >
      {CGV_CONTENT.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-lg font-medium text-gold">{section.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
        </section>
      ))}
    </LegalDocumentLayout>
  );
}

export function MentionsLegalesContent() {
  return (
    <LegalDocumentLayout title={MENTIONS_LEGALES_CONTENT.title}>
      {MENTIONS_LEGALES_CONTENT.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-lg font-medium text-gold">{section.heading}</h2>
          {"items" in section ? (
            <dl className="mt-3 space-y-2 text-sm">
              {section.items.map((item) => (
                <div key={item.label}>
                  <dt className="text-muted">{item.label}</dt>
                  <dd className="font-medium">{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {section.body}
            </p>
          )}
        </section>
      ))}
    </LegalDocumentLayout>
  );
}

export function ConfidentialiteContent() {
  return (
    <LegalDocumentLayout
      title={CONFIDENTIALITE_CONTENT.title}
      version={CONFIDENTIALITE_CONTENT.version}
    >
      {CONFIDENTIALITE_CONTENT.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-lg font-medium text-gold">{section.heading}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{section.body}</p>
        </section>
      ))}
    </LegalDocumentLayout>
  );
}

function ComparisonTable() {
  const publicDefs = PUBLIC_CHECKOUT_LICENSE_TYPES.map(
    (type) => getLicenseDefinition(type)!,
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-surface">
          <tr>
            <th className="px-4 py-3 font-medium">Licence</th>
            <th className="px-4 py-3 font-medium">Prix</th>
            <th className="px-4 py-3 font-medium">Streams</th>
            <th className="px-4 py-3 font-medium">Ventes</th>
            <th className="px-4 py-3 font-medium">Fichiers</th>
          </tr>
        </thead>
        <tbody>
          {publicDefs.map((def) => (
            <tr key={def.type} className="border-t border-border">
              <td className="px-4 py-3 font-medium">{def.commercialName}</td>
              <td className="px-4 py-3 text-gold">
                {formatLicensePriceDisplay(def)}
              </td>
              <td className="px-4 py-3 text-muted">
                {def.limits.find((l) => l.toLowerCase().includes("stream")) ??
                  "—"}
              </td>
              <td className="px-4 py-3 text-muted">
                {def.limits.find((l) => l.toLowerCase().includes("vente")) ??
                  "—"}
              </td>
              <td className="px-4 py-3 text-muted">
                {def.filesIncluded.join(", ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LicencesContent() {
  return (
    <LegalDocumentLayout
      title={LICENSE_PAGE_INTRO.title}
      subtitle={LICENSE_PAGE_INTRO.subtitle}
      version={LICENSE_VERSION}
    >
      <section>
        <h2 className="text-lg font-medium text-gold">Comparatif</h2>
        <div className="mt-4">
          <ComparisonTable />
        </div>
      </section>

      <div className="space-y-6">
        {PUBLIC_LICENSE_DEFINITIONS.map((license) => (
          <article
            key={license.type}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-medium">{license.commercialName}</h2>
              <p className="text-lg font-semibold text-gold">
                {formatLicensePriceDisplay(license)}
              </p>
            </div>

            <p className="mt-3 text-sm text-muted">
              Fichiers inclus :{" "}
              <span className="text-foreground">
                {license.filesIncluded.join(" · ")}
              </span>
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gold">
                  Droits
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {license.rights.map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-gold">
                  Limites & restrictions
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {[...license.limits, ...license.restrictions].map((item) => (
                    <li key={item}>· {item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mt-4 text-sm">
              Crédit obligatoire : <span className="text-gold">{license.credit}</span>
            </p>
          </article>
        ))}
      </div>

      <section>
        <h2 className="text-lg font-medium text-gold">FAQ</h2>
        <div className="mt-4 space-y-4">
          {LICENSE_FAQ.map((item) => (
            <div key={item.question} className="rounded-lg border border-border p-4">
              <h3 className="font-medium">{item.question}</h3>
              <p className="mt-2 text-sm text-muted">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-sm font-medium text-gold">Propriété</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {PROPERTY_NOTICE.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-gold/20 bg-gold/5 p-6">
        <h2 className="text-sm font-medium text-gold">À retenir</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          {LICENSE_PAGE_INTRO.footerNotes.map((note) => (
            <li key={note}>· {note}</li>
          ))}
        </ul>
      </section>
    </LegalDocumentLayout>
  );
}
