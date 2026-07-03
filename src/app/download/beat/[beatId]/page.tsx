import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatDownloadClient } from "@/components/download/beat-download-client";
import { LeskudLogo } from "@/components/brand/leskud-logo";
import { getPublishedBeatById } from "@/lib/beats/queries";
import { verifyFreeDownloadToken } from "@/lib/leads/download-token";

type Props = {
  params: Promise<{ beatId: string }>;
  searchParams: Promise<{
    token?: string;
    exp?: string;
    email?: string;
  }>;
};

export async function generateMetadata({ params }: Props) {
  const { beatId } = await params;
  const beat = await getPublishedBeatById(beatId);
  return { title: beat ? `Télécharger — ${beat.title}` : "Téléchargement" };
}

export default async function BeatDownloadPage({ params, searchParams }: Props) {
  const { beatId } = await params;
  const query = await searchParams;
  const beat = await getPublishedBeatById(beatId);

  if (!beat || !beat.preview_path) notFound();

  const token = query.token ?? "";
  const email = query.email ?? "";
  const exp = query.exp ? Number(query.exp) : NaN;

  const verification = verifyFreeDownloadToken({ beatId, email, exp, token });

  if (!verification.valid) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="flex justify-center">
          <LeskudLogo href="/" size="lg" shimmer />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">Lien invalide</h1>
        <p className="mt-3 text-sm text-muted">{verification.reason}</p>
        <Link
          href={`/beats/${beat.slug}`}
          className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
        >
          Retour au beat
        </Link>
      </div>
    );
  }

  return (
    <BeatDownloadClient
      beatId={beat.id}
      beatTitle={beat.title}
      beatSlug={beat.slug}
      email={email}
      token={token}
      exp={exp}
    />
  );
}
