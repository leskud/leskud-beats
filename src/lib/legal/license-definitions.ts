import type { LicenseType, PublicCheckoutLicenseType } from "@/lib/constants";
import {
  DEFAULT_LICENSE_PRICES,
  EXCLUSIVE_ON_REQUEST_LABEL,
  EXCLUSIVE_PRICE_HINT,
  LICENSE_LABELS,
  PUBLIC_CHECKOUT_LICENSE_TYPES,
} from "@/lib/constants";

export type LicensePricingMode = "fixed" | "on_request";

export type LicenseDefinition = {
  type: LicenseType;
  commercialName: string;
  priceCents: number | null;
  pricingMode: LicensePricingMode;
  priceDisplay?: string;
  filesIncluded: string[];
  rights: string[];
  limits: string[];
  restrictions: string[];
  credit: string;
};

export const COMMON_RESTRICTIONS = [
  "Interdiction de revendre l'instrumental seul",
  "Interdiction de redistribuer ou sous-licencier l'instrumental",
  "Interdiction de revendre les stems seuls",
  "Interdiction de créer ou revendre des samples issus de l'instrumental",
  "Interdiction de déposer une réclamation Content ID sur l'instrumental seul",
  "Interdiction de re-déposer l'instrumental seul comme œuvre originale",
  "Usage publicitaire, film, TV, jeu vidéo, marque ou synchronisation commerciale importante : accord complémentaire requis",
];

export const COMMON_RIGHTS_SUFFIX = [
  "Téléchargements gratuits autorisés (hors revente de l'instrumental)",
];

export const PROPERTY_NOTICE = [
  "LeSkud Beats reste propriétaire de l'instrumental original.",
  "Le client reste propriétaire de ses paroles et de son enregistrement vocal.",
  "Le morceau final est une œuvre dérivée autorisée par la licence.",
  "Les droits d'auteur/composition peuvent nécessiter une déclaration séparée selon exploitation/SACEM — à clarifier avec LeSkud si besoin.",
];

export const LICENSE_DEFINITIONS: LicenseDefinition[] = [
  {
    type: "mp3",
    commercialName: LICENSE_LABELS.mp3,
    priceCents: DEFAULT_LICENSE_PRICES.mp3,
    pricingMode: "fixed",
    filesIncluded: ["MP3"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 120 000 streams cumulés",
      "Jusqu'à 1 000 ventes physiques ou numériques",
      "1 clip / vidéo musicale",
      "Performances live autorisées",
      ...COMMON_RIGHTS_SUFFIX,
    ],
    limits: ["120 000 streams cumulés", "1 000 ventes", "1 clip"],
    restrictions: COMMON_RESTRICTIONS,
    credit: "prod. LeSkud",
  },
  {
    type: "wav",
    commercialName: LICENSE_LABELS.wav,
    priceCents: DEFAULT_LICENSE_PRICES.wav,
    pricingMode: "fixed",
    filesIncluded: ["MP3", "WAV"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 250 000 streams cumulés",
      "Jusqu'à 1 500 ventes physiques ou numériques",
      "1 clip / vidéo musicale",
      "Performances live autorisées",
      ...COMMON_RIGHTS_SUFFIX,
    ],
    limits: ["250 000 streams cumulés", "1 500 ventes", "1 clip"],
    restrictions: COMMON_RESTRICTIONS,
    credit: "prod. LeSkud",
  },
  {
    type: "stems",
    commercialName: LICENSE_LABELS.stems,
    priceCents: DEFAULT_LICENSE_PRICES.stems,
    pricingMode: "fixed",
    filesIncluded: ["MP3", "WAV", "Stems ZIP"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 500 000 streams cumulés",
      "Jusqu'à 3 000 ventes physiques ou numériques",
      "1 clip / vidéo musicale",
      "Performances live autorisées",
      ...COMMON_RIGHTS_SUFFIX,
    ],
    limits: ["500 000 streams cumulés", "3 000 ventes", "1 clip"],
    restrictions: COMMON_RESTRICTIONS,
    credit: "prod. LeSkud",
  },
  {
    type: "unlimited",
    commercialName: LICENSE_LABELS.unlimited,
    priceCents: DEFAULT_LICENSE_PRICES.unlimited,
    pricingMode: "fixed",
    filesIncluded: ["MP3", "WAV", "Stems ZIP"],
    rights: [
      "Usage non-exclusif",
      "Streams illimités",
      "Ventes physiques et numériques illimitées",
      "1 clip / vidéo musicale",
      "Performances live autorisées",
      ...COMMON_RIGHTS_SUFFIX,
    ],
    limits: ["Streams illimités", "Ventes illimitées", "1 clip"],
    restrictions: COMMON_RESTRICTIONS,
    credit: "prod. LeSkud",
  },
  {
    type: "exclusive",
    commercialName: LICENSE_LABELS.exclusive,
    priceCents: null,
    pricingMode: "on_request",
    priceDisplay: `${EXCLUSIVE_ON_REQUEST_LABEL} · ${EXCLUSIVE_PRICE_HINT}`,
    filesIncluded: ["MP3", "WAV", "Stems ZIP si disponibles"],
    rights: [
      "Usage exclusif négocié sur demande",
      "Retrait du catalogue après accord écrit",
      "Conditions et prix définis au cas par cas",
      "Contrat dédié possible",
    ],
    limits: [
      "Non disponible en achat automatique sur le site",
      "Les licences non-exclusives déjà vendues restent valables",
    ],
    restrictions: [
      ...COMMON_RESTRICTIONS,
      "Crédit « prod. LeSkud » fortement recommandé",
    ],
    credit: "prod. LeSkud",
  },
];

export type PublicLicenseDefinition = Omit<LicenseDefinition, "type"> & {
  type: PublicCheckoutLicenseType;
};

/** Définitions affichées sur le site public (hors exclusive legacy) */
export const PUBLIC_LICENSE_DEFINITIONS: PublicLicenseDefinition[] =
  PUBLIC_CHECKOUT_LICENSE_TYPES.map((type) => {
    const definition = LICENSE_DEFINITIONS.find((d) => d.type === type)!;
    return { ...definition, type };
  });

export const LICENSE_FAQ = [
  {
    question: "Puis-je sortir le morceau sur Spotify ?",
    answer:
      "Oui, dans les limites de streams et ventes de ta licence. Pour un usage au-delà des limites, contacte LeSkud pour un upgrade.",
  },
  {
    question: "Puis-je faire un clip ?",
    answer:
      "Oui — 1 clip / vidéo musicale est inclus sur toutes les licences publiques non-exclusives.",
  },
  {
    question: "Puis-je revendre les stems ?",
    answer: "Non. La revente ou redistribution des stems seuls est interdite.",
  },
  {
    question: "Que se passe-t-il si je dépasse les limites de ma licence ?",
    answer:
      "Contacte LeSkud pour un upgrade de licence avant de continuer l'exploitation commerciale au-delà des seuils.",
  },
] as const;

export function getLicenseDefinition(
  type: LicenseType,
): LicenseDefinition | undefined {
  return LICENSE_DEFINITIONS.find((definition) => definition.type === type);
}

export function formatLicensePriceDisplay(definition: LicenseDefinition): string {
  if (definition.pricingMode === "on_request") {
    return definition.priceDisplay ?? EXCLUSIVE_ON_REQUEST_LABEL;
  }
  if (definition.priceCents === null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(definition.priceCents / 100);
}

export function isPublicLicenseType(
  type: LicenseType,
): type is PublicCheckoutLicenseType {
  return PUBLIC_CHECKOUT_LICENSE_TYPES.includes(
    type as PublicCheckoutLicenseType,
  );
}
