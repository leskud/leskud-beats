import Link from "next/link";

export default function LicenseNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Licence introuvable</h1>
      <p className="mt-3 text-sm text-muted">
        Ce certificat n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link
        href="/account"
        className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
      >
        Retour à mes achats
      </Link>
    </div>
  );
}
