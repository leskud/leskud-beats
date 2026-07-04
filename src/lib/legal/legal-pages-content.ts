import { CONTACT_EMAIL, PRODUCER_NAME } from "@/lib/constants";

export const MENTIONS_LEGALES_CONTENT = {
  title: "Mentions légales",
  sections: [
    {
      heading: "Éditeur du site",
      items: [
        { label: "Nom commercial", value: PRODUCER_NAME },
        { label: "Responsable de publication", value: "Victor Le Rubrus / LeSkud Beats" },
        { label: "Email", value: CONTACT_EMAIL },
        { label: "Statut juridique", value: "[à compléter]" },
        { label: "SIRET", value: "[à compléter]" },
        { label: "Adresse", value: "[à compléter]" },
      ],
    },
    {
      heading: "Hébergement",
      items: [
        { label: "Hébergeur", value: "Vercel Inc." },
        { label: "Adresse", value: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis" },
        { label: "Site", value: "https://vercel.com" },
      ],
    },
    {
      heading: "Stockage et services",
      items: [
        {
          label: "Fichiers payants",
          value: "Cloudflare R2 (stockage privé des fichiers MP3, WAV, Stems)",
        },
        {
          label: "Base de données, authentification, previews/covers",
          value: "Supabase",
        },
        { label: "Paiements", value: "Stripe" },
        { label: "Emails transactionnels", value: "Resend (si activé)" },
      ],
    },
    {
      heading: "Propriété intellectuelle",
      body: "L'ensemble du site (textes, visuels, structure, logo) est la propriété de LeSkud Beats ou de ses partenaires. Les instrumentales sont protégées par le droit d'auteur. Toute reproduction non autorisée est interdite.",
    },
    {
      heading: "Contact",
      body: `Pour toute question : ${CONTACT_EMAIL}`,
    },
  ],
} as const;

export const CONFIDENTIALITE_CONTENT = {
  title: "Politique de confidentialité",
  version: "2026-07",
  sections: [
    {
      heading: "Responsable du traitement",
      body: `LeSkud Beats — ${CONTACT_EMAIL}`,
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
      body: "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité sur vos données personnelles, dans les limites prévues par la réglementation. Contact : leskud.contact@gmail.com",
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
