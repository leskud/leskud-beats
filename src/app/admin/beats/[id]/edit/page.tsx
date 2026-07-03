import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatEditForm } from "@/components/admin/beat-edit-form";
import { getBeatByIdAdmin } from "@/lib/beats/admin-queries";
import { requireAdmin } from "@/lib/admin/require-admin";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const beat = await getBeatByIdAdmin(id);
  return { title: beat ? `Modifier — ${beat.title}` : "Modifier" };
}

export default async function EditBeatPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const beat = await getBeatByIdAdmin(id);

  if (!beat) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        href="/admin"
        className="text-sm text-muted transition-colors hover:text-gold"
      >
        ← Retour à l&apos;admin
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">Modifier — {beat.title}</h1>
      <p className="mt-2 text-muted">/{beat.slug}</p>

      <div className="mt-8">
        <BeatEditForm beat={beat} />
      </div>
    </div>
  );
}
