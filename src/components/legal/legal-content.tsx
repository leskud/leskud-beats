import { LICENSE_DEFINITIONS } from "@/lib/legal/license-definitions";
import { CGV_CONTENT, LICENSE_PAGE_INTRO } from "@/lib/legal/terms-content";
import { LICENSE_VERSION } from "@/lib/legal/versions";
import { formatPrice } from "@/lib/utils";

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

export function LicencesContent() {
  return (
    <LegalDocumentLayout
      title={LICENSE_PAGE_INTRO.title}
      subtitle={LICENSE_PAGE_INTRO.subtitle}
      version={LICENSE_VERSION}
    >
      <div className="space-y-6">
        {LICENSE_DEFINITIONS.map((license) => (
          <article
            key={license.type}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-xl font-medium">{license.commercialName}</h2>
              <p className="text-lg font-semibold text-gold">
                {formatPrice(license.priceCents)}
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
          </article>
        ))}
      </div>

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
