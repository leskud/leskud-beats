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
import { EXCLUSIVE_SOLD_MESSAGE } from "@/lib/beats/exclusive-messages";
import { getLicenseAvailability, type LicenseAvailability } from "@/lib/beats/licenses";
import { LICENSE_DISPLAY_ORDER } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import {
  buildExclusiveMailto,
  formatLicensePriceDisplay,
  getLicenseDefinition,
  LICENSE_DEFINITIONS,
} from "@/lib/legal/license-definitions";
import {
  DOWNLOAD_FILE_LABELS,
  getEntitledFileTypes,
} from "@/lib/orders/download-entitlements";
import type { BeatLicense } from "@/types/database";
import type { BeatStatus } from "@/types";
import { cn } from "@/lib/utils";

type LicensePricingSectionProps = {
  mode: "home" | "beat";
  beatLicenses?: BeatLicense[];
  userEmail?: string | null;
  beatStatus?: BeatStatus;
  exclusiveAlreadySold?: boolean;
  beatTitle?: string;
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
  beatStatus,
  exclusiveAlreadySold = false,
  beatTitle = "ce beat",
}: LicensePricingSectionProps) {
  const [selectedType, setSelectedType] = useState<LicenseType | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedImmediateAccess, setAcceptedImmediateAccess] = useState(false);
  const [email, setEmail] = useState(userEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availabilityRows = useMemo(() => {
    return LICENSE_DISPLAY_ORDER.map((type) => {
      if (mode === "beat") {
        return getLicenseAvailability(beatLicenses, type, {
          beatStatus,
          exclusiveAlreadySold,
          beatTitle,
        });
      }

      const definition = getLicenseDefinition(type)!;
      return {
        type,
        available: definition.pricingMode === "fixed",
        priceCents: definition.priceCents,
        licenseId: null,
        unavailableReason:
          definition.pricingMode === "on_request"
            ? ("exclusive_on_request" as const)
            : undefined,
        unavailableLabel:
          definition.pricingMode === "on_request" ? "Sur demande" : undefined,
      } satisfies LicenseAvailability;
    });
  }, [mode, beatLicenses, beatStatus, exclusiveAlreadySold, beatTitle]);

  const availabilityMap = getAvailabilityMap(beatLicenses, availabilityRows);

  const acceptanceComplete = acceptedTerms && acceptedImmediateAccess;

  async function handleBuy(licenseType: LicenseType) {
    setError(null);

    if (licenseType === "exclusive") {
      setError("L'Exclusive est sur demande — utilise le bouton de contact.");
      return;
    }

    const availability = availabilityMap.get(licenseType);
    if (!availability?.licenseId) return;

    if (!acceptanceComplete) {
      setError("Tu dois accepter les deux conditions avant le paiement.");
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
          acceptedImmediateAccess: true,
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

  function renderActionButton(
    definition: (typeof LICENSE_DEFINITIONS)[number],
    availability: LicenseAvailability | undefined,
    isSelected: boolean,
  ) {
    if (mode === "home") {
      return (
        <Link
          href="/legal/licences"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-border text-sm transition-colors hover:border-gold/50 hover:text-gold"
        >
          Plus d&apos;infos
        </Link>
      );
    }

    if (definition.pricingMode === "on_request") {
      if (availability?.unavailableReason === "exclusive_sold") {
        return (
          <span className="flex h-9 items-center justify-center text-sm text-gold">
            {EXCLUSIVE_SOLD_MESSAGE}
          </span>
        );
      }

      return (
        <a
          href={buildExclusiveMailto(beatTitle)}
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gold/40 text-sm text-gold transition-colors hover:bg-gold/10"
        >
          Demander l&apos;exclusive
        </a>
      );
    }

    if (availability?.unavailableReason === "stems_unavailable") {
      return (
        <span className="flex min-h-9 items-center justify-center px-2 text-center text-sm text-muted">
          {availability.unavailableLabel}
        </span>
      );
    }

    if (availability?.available && availability.licenseId) {
      return (
        <Button
          type="button"
          variant={isSelected ? "primary" : "outline"}
          className="w-full text-sm"
          onClick={() => setSelectedType(definition.type)}
        >
          Choisir cette licence
        </Button>
      );
    }

    return (
      <span className="flex h-9 items-center justify-center text-sm text-muted">
        Indisponible
      </span>
    );
  }

  return (
    <section className="scroll-mt-24" id="licences">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold">Les licences</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Quatre licences non-exclusives pour sortir ta musique. L&apos;Exclusive
          est disponible sur demande.
          {mode === "home"
            ? " Consulte le détail complet avant d'acheter."
            : " Choisis ta licence et finalise ton achat."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {LICENSE_DEFINITIONS.map((definition) => {
          const availability = availabilityMap.get(definition.type);
          const isCheckoutable =
            mode === "beat" && Boolean(availability?.available && availability.licenseId);
          const isHighlighted = definition.type === "wav" || definition.type === "unlimited";
          const entitledFiles =
            mode === "beat" && beatLicenses.length > 0
              ? getEntitledFileTypes(definition.type, beatLicenses).map(
                  (fileType) => DOWNLOAD_FILE_LABELS[fileType],
                )
              : definition.filesIncluded;
          const isSelected = selectedType === definition.type;

          return (
            <article
              key={definition.type}
              className={cn(
                "flex flex-col rounded-xl border bg-surface p-5 transition-colors",
                isSelected
                  ? "border-gold/60 ring-1 ring-gold/30"
                  : isHighlighted
                    ? "border-gold/30"
                    : "border-border",
                !isCheckoutable &&
                  mode === "beat" &&
                  definition.pricingMode !== "on_request" &&
                  "opacity-80",
              )}
            >
              {isHighlighted ? (
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gold">
                  {definition.type === "wav" ? "Recommandé" : "Le plus complet"}
                </p>
              ) : null}

              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-medium">{definition.commercialName}</h3>
                <p className="shrink-0 text-lg font-semibold text-gold">
                  {formatLicensePriceDisplay(definition)}
                </p>
              </div>

              {definition.pricingMode === "on_request" ? (
                <p className="mt-2 text-sm text-muted">
                  Pour acheter cette prod en exclusivité, contactez-moi.
                  L&apos;exclusive retire la prod du catalogue après accord écrit.
                </p>
              ) : null}

              <p className="mt-3 text-xs uppercase tracking-wide text-muted">
                Fichiers inclus
              </p>
              <p className="mt-1 text-sm">
                {entitledFiles.length > 0
                  ? entitledFiles.join(" · ")
                  : availability?.unavailableLabel ?? "Indisponible pour ce beat"}
              </p>

              <ul className="mt-4 flex-1 space-y-1.5 text-sm text-muted">
                {definition.rights.slice(0, 5).map((right) => (
                  <li key={right}>· {right}</li>
                ))}
              </ul>

              <div className="mt-5">
                {renderActionButton(definition, availability, isSelected)}
              </div>
            </article>
          );
        })}
      </div>

      {mode === "beat" &&
      selectedType &&
      selectedType !== "exclusive" &&
      availabilityMap.get(selectedType)?.licenseId ? (
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
            acceptedTerms={acceptedTerms}
            acceptedImmediateAccess={acceptedImmediateAccess}
            onAcceptedTermsChange={setAcceptedTerms}
            onAcceptedImmediateAccessChange={setAcceptedImmediateAccess}
          />

          <Button
            type="button"
            variant="primary"
            disabled={loading || !acceptanceComplete}
            className="w-full"
            onClick={() => void handleBuy(selectedType)}
          >
            {loading
              ? "Redirection…"
              : `Acheter · ${formatLicensePriceDisplay(getLicenseDefinition(selectedType)!)}`}
          </Button>

          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
