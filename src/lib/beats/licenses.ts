import { LICENSE_TYPES, type LicenseType } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";
import type { BeatLicense } from "@/types/database";

export type LicenseAvailability = {
  type: LicenseType;
  available: boolean;
  priceCents: number | null;
  licenseId: string | null;
};

function licenseHasFile(license: BeatLicense): boolean {
  return Boolean(license.storage_path?.trim());
}

function canOfferUnlimited(licenses: BeatLicense[]): boolean {
  const stems = licenses.find((l) => l.license_type === "stems");
  const unlimited = licenses.find((l) => l.license_type === "unlimited");
  return (
    Boolean(stems?.is_available && licenseHasFile(stems)) &&
    Boolean(unlimited?.is_available)
  );
}

function canOfferExclusive(licenses: BeatLicense[]): boolean {
  const mp3 = licenses.find((l) => l.license_type === "mp3");
  const wav = licenses.find((l) => l.license_type === "wav");
  return (
    Boolean(mp3?.is_available && licenseHasFile(mp3)) &&
    Boolean(wav?.is_available && licenseHasFile(wav))
  );
}

export function getLicenseAvailability(
  licenses: BeatLicense[],
  type: LicenseType,
): LicenseAvailability {
  const license = licenses.find((l) => l.license_type === type);
  if (!license) {
    return { type, available: false, priceCents: null, licenseId: null };
  }

  if (type === "unlimited") {
    const unlimited = licenses.find((l) => l.license_type === "unlimited");
    const available = canOfferUnlimited(licenses);
    return {
      type,
      available,
      priceCents: available ? (unlimited?.price_cents ?? null) : null,
      licenseId: available ? (unlimited?.id ?? null) : null,
    };
  }

  if (type === "exclusive") {
    const available = canOfferExclusive(licenses);
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
  };
}

export function getCatalogueLicenseRows(
  licenses: BeatLicense[],
): LicenseAvailability[] {
  return LICENSE_TYPES.filter((t) => t !== "exclusive").map((type) =>
    getLicenseAvailability(licenses, type),
  );
}

export function formatLicenseCell(license: LicenseAvailability): string {
  if (!license.available) return "—";
  if (license.priceCents === null) return "—";
  return formatPrice(license.priceCents);
}
