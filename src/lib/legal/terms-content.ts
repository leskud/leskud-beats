import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";

export const CGV_CONTENT = {
  version: TERMS_VERSION,
  title: "Conditions générales de vente",
  sections: [
    {
      heading: "1. Objet",
      body: "Les présentes conditions générales de vente (CGV) régissent l'achat de licences d'instrumentales sur le site LeSkud Beats (leskud-beats.vercel.app), édité par LeSkud. Chaque achat correspond à une licence d'utilisation définie sur la page Licences et confirmée au moment du paiement.",
    },
    {
      heading: "2. Produits et licences",
      body: "LeSkud Beats commercialise des instrumentales sous différentes licences (MP3, Premium WAV, Premium + Stems, Unlimited + Stems, Exclusive). Les fichiers livrés et les droits accordés dépendent de la licence achetée. Le détail de chaque licence est disponible sur /legal/licences.",
    },
    {
      heading: "3. Commande et paiement",
      body: "Le paiement est effectué via Stripe. La commande n'est validée qu'après confirmation du paiement. L'acheteur doit accepter les présentes CGV et les conditions de licence applicables avant de procéder au paiement.",
    },
    {
      heading: "4. Livraison",
      body: "Après paiement confirmé, l'acheteur accède à ses fichiers depuis son espace « Mes achats » ou la page de confirmation de commande. Les fichiers sont fournis en téléchargement privé, selon la licence achetée et les fichiers disponibles pour le beat concerné.",
    },
    {
      heading: "5. Droit de rétractation",
      body: "Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques fournis immédiatement après achat, lorsque l'acheteur a expressément accepté de renoncer à son droit de rétractation en cochant la case d'acceptation avant paiement.",
    },
    {
      heading: "6. Utilisation des instrumentales",
      body: "L'acheteur s'engage à respecter les limites de la licence achetée (streams, clips, exclusivité, crédit producteur, etc.). Toute utilisation hors licence est interdite. LeSkud reste titulaire des droits d'auteur sur les instrumentales ; seul un droit d'utilisation est cédé.",
    },
    {
      heading: "7. Exclusive",
      body: "En cas d'achat d'une licence Exclusive, le beat est retiré du catalogue public après paiement validé. Les licences non-exclusives déjà vendues avant cet achat restent valables pour leurs titulaires.",
    },
    {
      heading: "8. Support",
      body: "Pour toute question relative à une commande ou une licence : leskud.contact@gmail.com",
    },
    {
      heading: "9. Version applicable",
      body: `Version en vigueur : ${TERMS_VERSION}. La version acceptée au moment de l'achat est enregistrée avec la commande.`,
    },
  ],
} as const;

export const LICENSE_PAGE_INTRO = {
  version: LICENSE_VERSION,
  title: "Licences LeSkud Beats",
  subtitle:
    "Choisis la licence adaptée à ton projet. Chaque palier inclut des fichiers et des droits précis — lis bien avant d'acheter.",
  footerNotes: [
    "Le crédit « Prod. LeSkud » est obligatoire sur toutes les licences non-exclusives, et fortement recommandé sur l'Exclusive.",
    "Tu ne peux pas revendre l'instrumentale seule ni prétendre en être le producteur.",
    "En cas d'achat Exclusive, les licences non-exclusives déjà vendues restent valables. L'exclusivité commence à la date du paiement validé.",
    "LeSkud conserve son droit moral et son crédit producteur sur toutes les instrumentales.",
  ],
} as const;
