import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BeatFreeDownloadButton } from "@/components/beats/beat-free-download-button";
import { PlayBeatButton } from "@/components/beats/play-beat-button";
import { LicensePricingSection } from "@/components/licenses/license-pricing-section";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { getBeatBySlug } from "@/lib/beats/queries";
import { getStartingPriceCents } from "@/lib/beats/pricing";
import { getUser } from "@/lib/supabase/server";
import {
  formatDuration,
  formatPrice,
  getPublicStorageUrl,
} from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const beat = await getBeatBySlug(slug);
  return { title: beat?.title ?? "Beat" };
}

export default async function BeatDetailPage({ params }: Props) {
  const { slug } = await params;
  const beat = await getBeatBySlug(slug);
  const user = await getUser();

  if (!beat) notFound();

  const coverUrl = beat.cover_path
    ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
    : null;

  const startingPrice = getStartingPriceCents(beat.beat_licenses ?? []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-surface">
          {coverUrl ? (
            <Image
              src={coverUrl}
              alt={beat.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          ) : null}
        </div>

        <div>
          <p className="text-sm uppercase tracking-widest text-gold">
            {beat.genre} · {beat.mood}
          </p>
          <h1 className="mt-2 text-4xl font-semibold">{beat.title}</h1>

          <p className="mt-4 text-muted">
            {beat.bpm} BPM · {beat.musical_key} ·{" "}
            {formatDuration(beat.duration_seconds)}
          </p>

          {beat.description && (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-muted">
              {beat.description}
            </p>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <PlayBeatButton beat={beat} />
            <BeatFreeDownloadButton beat={beat} />
          </div>

          {startingPrice !== null && (
            <p className="mt-6 text-sm text-muted">
              À partir de {formatPrice(startingPrice)}
            </p>
          )}

          <Link
            href="/#catalogue"
            className="mt-8 inline-block text-sm text-gold hover:text-gold-muted"
          >
            ← Retour au catalogue
          </Link>
        </div>
      </div>

      <div className="mt-16">
        <LicensePricingSection
          mode="beat"
          beatLicenses={beat.beat_licenses ?? []}
          userEmail={user?.email}
          beatStatus={beat.status}
        />
      </div>
    </div>
  );
}
