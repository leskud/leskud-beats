import { CONTACT_EMAIL } from "@/lib/constants";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";

export const CGV_CONTENT = {
  version: TERMS_VERSION,
  title: "Conditions Générales de Vente",
  sections: [
    {
      heading: "1. Objet",
      body: "Les présentes Conditions Générales de Vente (CGV) régissent la vente de licences d'utilisation d'instrumentales numériques sur le site LeSkud Beats, édité par LeSkud Beats. Chaque achat correspond à une licence non-exclusive définie sur la page Licences, sauf accord écrit distinct pour une licence exclusive.",
    },
    {
      heading: "2. Produits vendus",
      body: "LeSkud Beats commercialise des licences d'utilisation d'instrumentales (MP3, Premium WAV, Premium + Stems, Unlimited + Stems). Les fichiers livrés et les droits accordés dépendent de la licence achetée. La licence Exclusive n'est pas vendue automatiquement sur le site : elle fait l'objet d'une demande et d'un accord préalable.",
    },
    {
      heading: "3. Prix",
      body: "Les prix sont indiqués en euros, toutes taxes comprises (TTC), sur les pages du site au moment de l'achat. LeSkud Beats se réserve le droit de modifier ses tarifs ; le prix applicable est celui affiché au moment de la validation du paiement.",
    },
    {
      heading: "4. Commande et paiement",
      body: "Le paiement est effectué via Stripe. La commande n'est validée qu'après confirmation du paiement. L'acheteur doit accepter les présentes CGV et les conditions de licence applicables, ainsi que la renonciation au droit de rétractation pour les contenus numériques livrés immédiatement, avant de procéder au paiement.",
    },
    {
      heading: "5. Livraison numérique",
      body: "Après paiement validé, l'acheteur accède immédiatement à ses fichiers depuis son espace « Mes achats » (/account) ou la page de confirmation de commande. Les fichiers sont fournis en téléchargement privé, selon la licence achetée et les fichiers disponibles pour le beat concerné.",
    },
    {
      heading: "6. Compte client",
      body: "L'acheteur peut créer un compte ou recevoir ses achats par email. L'accès aux téléchargements est lié à la commande payée et reste disponible depuis l'espace client, sous réserve des conditions techniques du service.",
    },
    {
      heading: "7. Droit de rétractation",
      body: "Conformément à l'article L221-28 du Code de la consommation, le droit de rétractation ne s'applique pas aux contenus numériques fournis immédiatement après achat, lorsque l'acheteur a expressément demandé l'accès immédiat et reconnu que le téléchargement peut entraîner la renonciation au droit de rétractation lorsque la loi le permet.",
    },
    {
      heading: "8. Licence d'utilisation",
      body: "L'achat confère un droit d'utilisation non-exclusif dans les limites de la licence choisie (streams, ventes, clips, fichiers inclus). LeSkud Beats reste titulaire des droits sur l'instrumental original. Le détail des droits, limites et restrictions est disponible sur /legal/licences et sur le certificat de licence.",
    },
    {
      heading: "9. Obligations du client",
      body: "L'acheteur s'engage à respecter les limites de sa licence, à créditer « prod. LeSkud » lorsque c'est possible sur les plateformes, et à ne pas revendre, redistribuer ou sous-licencier l'instrumental ou les stems seuls.",
    },
    {
      heading: "10. Interdictions",
      body: "Sont notamment interdits : la revente de l'instrumental seul, la redistribution des stems, la création/revente de samples issus de l'instrumental, le dépôt Content ID sur l'instrumental seul, et tout usage publicitaire/TV/film/jeu vidéo/marque important sans accord complémentaire.",
    },
    {
      heading: "11. Remboursements",
      body: "Aucun remboursement n'est accordé après téléchargement des fichiers, sauf problème technique avéré empêchant l'accès aux fichiers achetés ou obligation légale impérative.",
    },
    {
      heading: "12. Licence Exclusive",
      body: "La licence Exclusive n'est pas disponible en achat automatique sur le site. Elle fait l'objet d'une demande par email et d'un accord écrit. En cas de vente exclusive conclue hors site, le beat est retiré du catalogue ; les licences non-exclusives déjà vendues restent valables pour leurs titulaires.",
    },
    {
      heading: "13. Support",
      body: `Pour toute question : ${CONTACT_EMAIL}`,
    },
    {
      heading: "14. Médiation consommation",
      body: "Conformément aux articles L612-1 et suivants du Code de la consommation, le client peut recourir gratuitement à un médiateur de la consommation en vue de la résolution amiable d'un litige. Médiateur compétent : [à compléter].",
    },
    {
      heading: "15. Droit applicable",
      body: "Les présentes CGV sont soumises au droit français. En cas de litige, les tribunaux français seront compétents, sous réserve des dispositions légales impératives applicables aux consommateurs.",
    },
    {
      heading: "16. Version applicable",
      body: `Version en vigueur : ${TERMS_VERSION}. La version acceptée au moment de l'achat est enregistrée avec la commande.`,
    },
  ],
} as const;

export const LICENSE_PAGE_INTRO = {
  version: LICENSE_VERSION,
  title: "Licences",
  subtitle:
    "Quatre licences publiques non-exclusives pour sortir ta musique. L'Exclusive est disponible sur demande.",
  footerNotes: [
    "Crédit obligatoire : « prod. LeSkud » sur les plateformes lorsque c'est possible.",
    "Tu ne peux pas revendre l'instrumental seul ni les stems seuls.",
    "L'Exclusive retire la prod du catalogue après accord écrit — contacte-nous pour en discuter.",
    "LeSkud Beats reste propriétaire de l'instrumental ; tu restes propriétaire de tes paroles et de ton vocal.",
  ],
} as const;
