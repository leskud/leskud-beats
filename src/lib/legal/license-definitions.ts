import type { LicenseType } from "@/lib/constants";
import { DEFAULT_LICENSE_PRICES, LICENSE_LABELS } from "@/lib/constants";

export type LicenseDefinition = {
  type: LicenseType;
  commercialName: string;
  priceCents: number;
  filesIncluded: string[];
  rights: string[];
  limits: string[];
  restrictions: string[];
};

const COMMON_RESTRICTIONS = [
  "Crédit obligatoire : « Prod. LeSkud »",
  "Interdiction de revendre l'instrumentale seule",
  "Interdiction de prétendre être le producteur du beat",
];

export const LICENSE_DEFINITIONS: LicenseDefinition[] = [
  {
    type: "mp3",
    commercialName: LICENSE_LABELS.mp3,
    priceCents: DEFAULT_LICENSE_PRICES.mp3,
    filesIncluded: ["MP3"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 100 000 streams",
      "1 clip musical",
      "Performances live autorisées",
    ],
    limits: ["Streams limités à 100 000", "1 clip musical"],
    restrictions: COMMON_RESTRICTIONS,
  },
  {
    type: "wav",
    commercialName: LICENSE_LABELS.wav,
    priceCents: DEFAULT_LICENSE_PRICES.wav,
    filesIncluded: ["MP3", "WAV"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 250 000 streams",
      "1 clip musical",
      "Performances live autorisées",
      "Radio locale / web radio autorisée",
    ],
    limits: ["Streams limités à 250 000", "1 clip musical"],
    restrictions: COMMON_RESTRICTIONS,
  },
  {
    type: "stems",
    commercialName: LICENSE_LABELS.stems,
    priceCents: DEFAULT_LICENSE_PRICES.stems,
    filesIncluded: ["Stems", "WAV", "MP3"],
    rights: [
      "Usage non-exclusif",
      "Jusqu'à 500 000 streams",
      "2 clips musicaux",
      "Performances live autorisées",
      "Radio autorisée",
      "Idéal pour mix / master studio",
    ],
    limits: ["Streams limités à 500 000", "2 clips musicaux"],
    restrictions: COMMON_RESTRICTIONS,
  },
  {
    type: "unlimited",
    commercialName: LICENSE_LABELS.unlimited,
    priceCents: DEFAULT_LICENSE_PRICES.unlimited,
    filesIncluded: ["Stems", "WAV", "MP3"],
    rights: [
      "Usage non-exclusif",
      "Pas de limite de streams",
      "Pas de limite de ventes",
      "Clips illimités",
      "Performances live autorisées",
      "Radio autorisée",
    ],
    limits: ["Streams et ventes illimités", "Clips illimités"],
    restrictions: COMMON_RESTRICTIONS,
  },
  {
    type: "exclusive",
    commercialName: LICENSE_LABELS.exclusive,
    priceCents: DEFAULT_LICENSE_PRICES.exclusive,
    filesIncluded: ["WAV", "MP3", "Stems si disponibles"],
    rights: [
      "Usage exclusif à partir de la date d'achat confirmée",
      "Le beat est retiré du catalogue après achat",
      "Pas de limite de streams",
      "Pas de limite de ventes",
      "Clips illimités",
      "Performances live autorisées",
      "Radio autorisée",
    ],
    limits: [
      "Exclusivité effective dès paiement validé",
      "Les anciennes licences non-exclusives déjà vendues restent valables",
    ],
    restrictions: [
      "Crédit « Prod. LeSkud » obligatoire ou fortement recommandé",
      "Interdiction de revendre l'instrumentale seule",
      "Interdiction de prétendre être le producteur du beat",
      "LeSkud conserve son droit moral et son crédit producteur",
    ],
  },
];

export function getLicenseDefinition(
  type: LicenseType,
): LicenseDefinition | undefined {
  return LICENSE_DEFINITIONS.find((definition) => definition.type === type);
}
