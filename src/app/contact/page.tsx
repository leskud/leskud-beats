import { CONTACT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: "Contact",
};

const MAILTO_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Contact LeSkud Beats")}`;

export default function ContactPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-16 sm:px-6">
      <div className="rounded-xl border border-border bg-surface p-8 text-center sm:p-10">
        <h1 className="text-3xl font-semibold">Contact</h1>

        <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">
          Une question sur une prod, une licence ou un achat ? Tu peux me
          contacter directement par email.
        </p>

        <p className="mt-8">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-lg font-medium text-gold underline-offset-4 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        <a
          href={MAILTO_HREF}
          className="mt-8 inline-flex h-11 items-center justify-center rounded-lg bg-gold px-6 text-sm font-medium text-background transition-colors hover:bg-gold-muted"
        >
          Envoyer un email
        </a>

        <p className="mt-6 text-xs text-muted">Je réponds dès que possible.</p>
      </div>
    </div>
  );
}
