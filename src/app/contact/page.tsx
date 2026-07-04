import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/constants";
import { buildExclusiveMailto } from "@/lib/legal/license-definitions";

export const metadata = {
  title: "Contact",
};

function ContactBlock({
  title,
  description,
  mailtoHref,
  buttonLabel,
}: {
  title: string;
  description: string;
  mailtoHref: string;
  buttonLabel: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <h2 className="text-lg font-medium text-gold">{title}</h2>
      <p className="mt-2 text-sm text-muted">{description}</p>
      <a
        href={mailtoHref}
        className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-gold/40 px-4 text-sm text-gold transition-colors hover:bg-gold/10"
      >
        {buttonLabel}
      </a>
    </section>
  );
}

export default function ContactPage() {
  const supportMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Support achat LeSkud Beats")}&body=${encodeURIComponent("Bonjour LeSkud,\n\nJ'ai un problème avec mon achat :\n\nEmail utilisé : …\nBeat concerné : …\nDescription : …\n\nCordialement,")}`;

  const customLicenseMailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Demande licence personnalisée")}&body=${encodeURIComponent("Bonjour LeSkud,\n\nJe souhaite discuter d'une licence personnalisée.\n\nMon nom d'artiste : …\nMon projet : …\n\nCordialement,")}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">Contact</h1>
      <p className="mt-3 text-muted">
        Une question sur une licence, un achat ou une demande exclusive ?
        Écris-nous directement.
      </p>

      <p className="mt-6 text-sm">
        Email :{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-gold underline-offset-2 hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </p>

      <div className="mt-10 space-y-4">
        <ContactBlock
          title="Demande exclusive"
          description="Tu veux acheter une prod en exclusivité ? Décris ton projet et on en discute."
          mailtoHref={buildExclusiveMailto("votre beat")}
          buttonLabel="Demander l'exclusive"
        />

        <ContactBlock
          title="Problème avec un achat"
          description="Fichier manquant, erreur de téléchargement ou question sur ta commande."
          mailtoHref={supportMailto}
          buttonLabel="Contacter le support"
        />

        <ContactBlock
          title="Licence personnalisée"
          description="Besoin d'un usage spécifique (pub, synchro, upgrade) ? Contacte-nous."
          mailtoHref={customLicenseMailto}
          buttonLabel="Demander une licence sur mesure"
        />
      </div>

      <section className="mt-10 rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-medium">Formulaire rapide</h2>
        <p className="mt-2 text-sm text-muted">
          Pour le lancement, utilise les boutons ci-dessus (email pré-rempli).
          Tu peux aussi nous écrire directement avec :
        </p>
        <ul className="mt-3 space-y-1 text-sm text-muted">
          <li>· Nom / nom d&apos;artiste</li>
          <li>· Email</li>
          <li>· Sujet (achat, exclusive, support, autre)</li>
          <li>· Beat concerné (optionnel)</li>
          <li>· Message</li>
        </ul>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-4 inline-flex text-sm text-gold underline-offset-2 hover:underline"
        >
          Ouvrir mon client mail
        </a>
      </section>

      <Link
        href="/"
        className="mt-10 inline-block text-sm text-gold underline-offset-2 hover:underline"
      >
        ← Retour à l&apos;accueil
      </Link>
    </div>
  );
}
