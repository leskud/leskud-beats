import { LICENSE_TYPES, type LicenseType } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { BeatLicense } from "@/types/database";
import type { BeatStatus } from "@/types";

export type LicenseUnavailableReason =
  | "exclusive_sold"
  | "exclusive_on_request"
  | "stems_unavailable"
  | "files_missing";

export type LicenseAvailability = {
  type: LicenseType;
  available: boolean;
  priceCents: number | null;
  licenseId: string | null;
  unavailableReason?: LicenseUnavailableReason;
  unavailableLabel?: string;
};

export type LicenseAvailabilityContext = {
  beatStatus?: BeatStatus;
  exclusiveAlreadySold?: boolean;
  beatTitle?: string;
};

function licenseHasFile(license: BeatLicense): boolean {
  return Boolean(license.storage_path?.trim());
}

function hasStemsFile(licenses: BeatLicense[]): boolean {
  const stems = licenses.find((l) => l.license_type === "stems");
  return Boolean(stems?.storage_path?.trim());
}

function canOfferStemsLicense(licenses: BeatLicense[]): boolean {
  const stems = licenses.find((l) => l.license_type === "stems");
  return Boolean(stems?.is_available && licenseHasFile(stems));
}

function canOfferUnlimited(licenses: BeatLicense[]): boolean {
  const unlimited = licenses.find((l) => l.license_type === "unlimited");
  return (
    hasStemsFile(licenses) &&
    Boolean(unlimited?.is_available)
  );
}

export function getLicenseAvailability(
  licenses: BeatLicense[],
  type: LicenseType,
  context?: LicenseAvailabilityContext,
): LicenseAvailability {
  const license = licenses.find((l) => l.license_type === type);
  if (!license) {
    return { type, available: false, priceCents: null, licenseId: null };
  }

  if (type === "exclusive") {
    if (context?.beatStatus === "sold_exclusive" || context?.exclusiveAlreadySold) {
      return {
        type,
        available: false,
        priceCents: null,
        licenseId: null,
        unavailableReason: "exclusive_sold",
        unavailableLabel: "Exclusive déjà vendue.",
      };
    }

    return {
      type,
      available: false,
      priceCents: null,
      licenseId: null,
      unavailableReason: "exclusive_on_request",
      unavailableLabel: "Sur demande",
    };
  }

  if (type === "stems") {
    if (!hasStemsFile(licenses)) {
      return {
        type,
        available: false,
        priceCents: license.price_cents,
        licenseId: null,
        unavailableReason: "stems_unavailable",
        unavailableLabel: "Stems indisponibles pour cette prod",
      };
    }
    const available = canOfferStemsLicense(licenses);
    return {
      type,
      available,
      priceCents: license.price_cents,
      licenseId: available ? license.id : null,
    };
  }

  if (type === "unlimited") {
    if (!hasStemsFile(licenses)) {
      return {
        type,
        available: false,
        priceCents: license.price_cents,
        licenseId: null,
        unavailableReason: "stems_unavailable",
        unavailableLabel: "Stems indisponibles pour cette prod",
      };
    }
    const available = canOfferUnlimited(licenses);
    return {
      type,
      available,
      priceCents: available ? license.price_cents : null,
      licenseId: available ? license.id : null,
    };
  }

  const hasFile = licenseHasFile(license);
  const available = license.is_available && hasFile;
  return {
    type,
    available,
    priceCents: hasFile ? license.price_cents : null,
    licenseId: available ? license.id : null,
    unavailableReason: !hasFile ? "files_missing" : undefined,
  };
}

export function getCatalogueLicenseRows(
  licenses: BeatLicense[],
  context?: LicenseAvailabilityContext,
): LicenseAvailability[] {
  return LICENSE_TYPES.filter((t) => t !== "exclusive").map((type) =>
    getLicenseAvailability(licenses, type, context),
  );
}

export function formatLicenseCell(license: LicenseAvailability): string {
  if (!license.available) return "—";
  if (license.priceCents === null) return "—";
  return formatPrice(license.priceCents);
}
