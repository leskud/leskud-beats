import { CONTACT_EMAIL } from "@/lib/constants";

export const PUBLIC_BRAND_NAME = "LeSkud Beats";

export const MENTIONS_LEGALES_CONTENT = {
  title: "Mentions légales",
  fields: [
    { label: "Nom du site", value: PUBLIC_BRAND_NAME },
    { label: "Contact", value: CONTACT_EMAIL },
    { label: "Éditeur du site", value: PUBLIC_BRAND_NAME },
  ],
  hosting: "Vercel",
  technicalServices: [
    "Supabase : authentification, base de données, stockage léger",
    "Cloudflare R2 : stockage des fichiers numériques",
    "Stripe : paiements sécurisés",
    "Vercel : hébergement du site",
  ],
  intellectualProperty:
    "Les contenus du site, les visuels, textes, éléments graphiques et instrumentales sont protégés. Toute reproduction ou redistribution non autorisée est interdite.",
  contactNote: `Pour toute demande : ${CONTACT_EMAIL}`,
  evolutionNote:
    "Les informations légales et administratives pourront être complétées en fonction de l'évolution de l'activité.",
} as const;

export const CONFIDENTIALITE_CONTENT = {
  title: "Politique de confidentialité",
  version: "2026-07",
  sections: [
    {
      heading: "Responsable du traitement",
      body: `${PUBLIC_BRAND_NAME} — ${CONTACT_EMAIL}`,
    },
    {
      heading: "Données collectées",
      body: "Nous pouvons collecter : adresse email, nom ou nom d'artiste si fourni, historique de commandes, informations de paiement limitées via Stripe (nous ne stockons pas vos coordonnées bancaires), logs techniques, adresse IP et user-agent lors de l'acceptation des CGV/licence.",
    },
    {
      heading: "Finalités",
      body: "Gestion du compte client, livraison des achats, preuve d'acceptation des conditions, support client, sécurité du service et amélioration technique.",
    },
    {
      heading: "Services tiers",
      body: "Vos données peuvent être traitées par : Supabase (hébergement base de données et auth), Stripe (paiement), Vercel (hébergement application), Cloudflare R2 (stockage fichiers payants), Resend (envoi d'emails si utilisé). Ces prestataires agissent selon leurs propres politiques de confidentialité.",
    },
    {
      heading: "Durée de conservation",
      body: "Les données de compte et de commande sont conservées pendant la durée nécessaire à la gestion de la relation commerciale, aux obligations légales et à la preuve des licences. Les logs techniques sont conservés pour une durée limitée, proportionnée aux besoins de sécurité.",
    },
    {
      heading: "Vos droits (RGPD)",
      body: `Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données personnelles, dans les limites prévues par la réglementation. Contact : ${CONTACT_EMAIL}`,
    },
    {
      heading: "Cookies",
      body: "Le site utilise des cookies et stockages locaux strictement nécessaires au fonctionnement (session, authentification). Si des outils d'analyse ou cookies non essentiels sont ajoutés ultérieurement, un mécanisme de consentement sera mis en place.",
    },
    {
      heading: "Contact",
      body: `Pour exercer vos droits ou poser une question : ${CONTACT_EMAIL}`,
    },
  ],
} as const;
