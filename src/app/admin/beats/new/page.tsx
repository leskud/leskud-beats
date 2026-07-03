import Link from "next/link";
import { BeatForm } from "@/components/admin/beat-form";
import { requireAdmin } from "@/lib/admin/require-admin";

export const metadata = {
  title: "Nouveau beat",
};

export default async function NewBeatPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <Link
          href="/admin"
          className="text-sm text-muted transition-colors hover:text-gold"
        >
          ← Retour à l&apos;admin
        </Link>
        <h1 className="mt-4 text-3xl font-semibold">Nouveau beat</h1>
        <p className="mt-2 text-muted">
          Les 4 licences seront créées automatiquement avec les prix par défaut.
        </p>
      </div>

      <BeatForm />
    </div>
  );
}
