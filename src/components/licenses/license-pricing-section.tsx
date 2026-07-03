"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LicenseAcceptanceCheckbox,
  LICENSE_VERSION,
  TERMS_VERSION,
} from "@/components/licenses/license-acceptance-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLicenseAvailability, type LicenseAvailability } from "@/lib/beats/licenses";
import { LICENSE_DISPLAY_ORDER } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import { LICENSE_DEFINITIONS } from "@/lib/legal/license-definitions";
import {
  DOWNLOAD_FILE_LABELS,
  getEntitledFileTypes,
} from "@/lib/orders/download-entitlements";
import type { BeatLicense } from "@/types/database";
import { cn, formatPrice } from "@/lib/utils";

type LicensePricingSectionProps = {
  mode: "home" | "beat";
  beatLicenses?: BeatLicense[];
  userEmail?: string | null;
};

function getAvailabilityMap(
  beatLicenses: BeatLicense[],
  availabilityRows: LicenseAvailability[],
): Map<LicenseType, LicenseAvailability> {
  return new Map(availabilityRows.map((row) => [row.type, row]));
}

export function LicensePricingSection({
  mode,
  beatLicenses = [],
  userEmail,
}: LicensePricingSectionProps) {
  const [selectedType, setSelectedType] = useState<LicenseType | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [email, setEmail] = useState(userEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availabilityRows = useMemo(() => {
    if (mode === "beat") {
      return LICENSE_DISPLAY_ORDER.map((type) =>
        getLicenseAvailability(beatLicenses, type),
      );
    }

    return LICENSE_DISPLAY_ORDER.map((type) => ({
      type,
      available: true,
      priceCents:
        LICENSE_DEFINITIONS.find((definition) => definition.type === type)
          ?.priceCents ?? null,
      licenseId: null,
    })) satisfies LicenseAvailability[];
  }, [mode, beatLicenses]);

  const availabilityMap = getAvailabilityMap(beatLicenses, availabilityRows);

  async function handleBuy(licenseType: LicenseType) {
    setError(null);

    const availability = availabilityMap.get(licenseType);
    if (!availability?.licenseId) return;

    if (!acceptedTerms) {
      setError("Tu dois accepter les CGV et les conditions de licence.");
      return;
    }

    const checkoutEmail = userEmail ?? email.trim();
    if (!checkoutEmail) {
      setError("Indique ton email pour continuer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatLicenseId: availability.licenseId,
          email: userEmail ? undefined : checkoutEmail,
          acceptedTerms: true,
          termsVersion: TERMS_VERSION,
          licenseVersion: LICENSE_VERSION,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Impossible de démarrer le paiement.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="scroll-mt-24" id="licences">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Les licences</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Des paliers clairs pour ton projet — du MP3 à l&apos;exclusive.
          {mode === "home" ? " Consulte le détail complet avant d&apos;acheter." : " Choisis ta licence et finalise ton achat."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LICENSE_DEFINITIONS.map((definition) => {
          const availability = availabilityMap.get(definition.type);
          const isAvailable = mode === "home" || Boolean(availability?.available);
          const priceCents =
            availability?.priceCents ?? definition.priceCents;
          const entitledFiles =
            mode === "beat" && beatLicenses.length > 0
              ? getEntitledFileTypes(definition.type, beatLicenses).map(
                  (fileType) => DOWNLOAD_FILE_LABELS[fileType],
                )
              : definition.filesIncluded.filter(
                  (file) => !file.includes("si disponibles"),
                );
          const isSelected = selectedType === definition.type;

          return (
            <article
              key={definition.type}
              className={cn(
                "flex flex-col rounded-xl border bg-surface p-5 transition-colors",
                isSelected
                  ? "border-gold/60 ring-1 ring-gold/30"
                  : "border-border",
                !isAvailable && mode === "beat" && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium">{definition.commercialName}</h3>
                <p className="shrink-0 text-lg font-semibold text-gold">
                  {formatPrice(priceCents)}
                </p>
              </div>

              <p className="mt-3 text-xs uppercase tracking-wide text-muted">
                Fichiers inclus
              </p>
              <p className="mt-1 text-sm">
                {entitledFiles.length > 0
                  ? entitledFiles.join(" · ")
                  : "Indisponible pour ce beat"}
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted">
                {definition.rights.slice(0, 4).map((right) => (
                  <li key={right}>· {right}</li>
                ))}
              </ul>

              <div className="mt-5">
                {mode === "home" ? (
                  <Link
                    href="/legal/licences"
                    className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border text-sm transition-colors hover:border-gold/50 hover:text-gold"
                  >
                    Plus d&apos;infos
                  </Link>
                ) : isAvailable && availability?.licenseId ? (
                  <Button
                    type="button"
                    variant={isSelected ? "primary" : "outline"}
                    className="w-full text-sm"
                    onClick={() => setSelectedType(definition.type)}
                  >
                    Choisir cette licence
                  </Button>
                ) : (
                  <span className="flex h-9 items-center justify-center text-sm text-muted">
                    Indisponible
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {mode === "beat" && selectedType && availabilityMap.get(selectedType)?.licenseId ? (
        <div className="mt-8 max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6">
          {!userEmail ? (
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ton@email.com"
              required
            />
          ) : null}

          <LicenseAcceptanceCheckbox
            checked={acceptedTerms}
            onChange={setAcceptedTerms}
          />

          <Button
            type="button"
            variant="primary"
            disabled={loading || !acceptedTerms}
            className="w-full"
            onClick={() => void handleBuy(selectedType)}
          >
            {loading
              ? "Redirection…"
              : `Acheter · ${formatPrice(availabilityMap.get(selectedType)?.priceCents ?? 0)}`}
          </Button>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
