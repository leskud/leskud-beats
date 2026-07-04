"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/cart-provider";
import { getLicenseAvailability, type LicenseAvailability } from "@/lib/beats/licenses";
import { LICENSE_DISPLAY_ORDER } from "@/lib/constants";
import type { PublicCheckoutLicenseType } from "@/lib/constants";
import {
  formatLicensePriceDisplay,
  getLicenseDefinition,
  PUBLIC_LICENSE_DEFINITIONS,
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
  beatId?: string;
  beatSlug?: string;
  beatTitle?: string;
  coverPath?: string | null;
};

function getAvailabilityMap(
  beatLicenses: BeatLicense[],
  availabilityRows: LicenseAvailability[],
): Map<PublicCheckoutLicenseType, LicenseAvailability> {
  return new Map(
    availabilityRows.map((row) => [row.type as PublicCheckoutLicenseType, row]),
  );
}

export function LicensePricingSection({
  mode,
  beatLicenses = [],
  beatStatus,
  beatId = "",
  beatSlug = "",
  beatTitle = "ce beat",
  coverPath = null,
}: LicensePricingSectionProps) {
  const { addItem } = useCart();
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);

  const availabilityRows = useMemo(() => {
    return LICENSE_DISPLAY_ORDER.map((type) => {
      if (mode === "beat") {
        return getLicenseAvailability(beatLicenses, type, { beatStatus });
      }

      const definition = getLicenseDefinition(type)!;
      return {
        type,
        available: true,
        priceCents: definition.priceCents,
        licenseId: null,
      } satisfies LicenseAvailability;
    });
  }, [mode, beatLicenses, beatStatus]);

  const availabilityMap = getAvailabilityMap(beatLicenses, availabilityRows);

  function handleAddToCart(licenseType: PublicCheckoutLicenseType) {
    const availability = availabilityMap.get(licenseType);
    const definition = getLicenseDefinition(licenseType)!;

    if (!availability?.licenseId || !availability.available) return;

    const entitledFiles = getEntitledFileTypes(licenseType, beatLicenses).map(
      (fileType) => DOWNLOAD_FILE_LABELS[fileType],
    );

    addItem({
      beatLicenseId: availability.licenseId,
      beatId,
      beatSlug,
      beatTitle,
      coverPath,
      licenseType,
      licenseLabel: definition.commercialName,
      priceCents: availability.priceCents ?? definition.priceCents ?? 0,
      filesIncluded:
        entitledFiles.length > 0 ? entitledFiles : definition.filesIncluded,
      addedAt: new Date().toISOString(),
    });

    setCartFeedback(definition.commercialName);
    window.setTimeout(() => setCartFeedback(null), 5000);
  }

  function renderActionButton(
    definition: (typeof PUBLIC_LICENSE_DEFINITIONS)[number],
    availability: LicenseAvailability | undefined,
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

    if (availability?.unavailableReason === "stems_unavailable") {
      return (
        <span className="flex min-h-9 items-center justify-center px-2 text-center text-sm text-muted">
          {availability.unavailableLabel}
        </span>
      );
    }

    if (availability?.available && availability.licenseId) {
      return (
        <button
          type="button"
          className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-gold/40 text-sm text-gold transition-colors hover:bg-gold/10"
          onClick={() => handleAddToCart(definition.type)}
        >
          Ajouter au panier
        </button>
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
          Quatre licences non-exclusives pour sortir ta musique.
          {mode === "home"
            ? " Consulte le détail complet avant d'acheter."
            : " Ajoute ta licence au panier pour finaliser ton achat."}
        </p>
      </div>

      {cartFeedback ? (
        <div className="mb-6 rounded-xl border border-gold/30 bg-gold/10 p-4 text-sm">
          <p className="font-medium text-gold">
            Licence ajoutée au panier — {cartFeedback}
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/cart"
              className="text-gold underline-offset-2 hover:underline"
            >
              Voir le panier
            </Link>
            <Link
              href="/#catalogue"
              className="text-muted underline-offset-2 hover:underline"
            >
              Continuer mes achats
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PUBLIC_LICENSE_DEFINITIONS.map((definition) => {
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

          return (
            <article
              key={definition.type}
              className={cn(
                "flex flex-col rounded-xl border bg-surface p-5 transition-colors",
                isHighlighted ? "border-gold/30" : "border-border",
                !isCheckoutable && mode === "beat" && "opacity-80",
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
                {renderActionButton(definition, availability)}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
