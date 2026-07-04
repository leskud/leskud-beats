"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Music2, Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/audio/player-provider";
import { FreeDownloadButton } from "@/components/free-download/free-download-button";
import type { PlayerTrack } from "@/components/audio/player-provider";
import { getCatalogueLicenseRows } from "@/lib/beats/licenses";
import { getStartingPriceCents } from "@/lib/beats/pricing";
import { beatToPlayerTrack } from "@/lib/beats/player";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { cn, formatDuration, formatPrice, getPublicStorageUrl } from "@/lib/utils";
import type { BeatWithLicenses } from "@/types/database";

const FILE_BADGE_TYPES = ["mp3", "wav", "stems"] as const;
type FileBadgeType = (typeof FILE_BADGE_TYPES)[number];

const FILE_BADGE_LABELS: Record<FileBadgeType, string> = {
  mp3: "MP3",
  wav: "WAV",
  stems: "STEMS",
};

type BeatCatalogueListProps = {
  beats: BeatWithLicenses[];
  playlist: PlayerTrack[];
};

export function BeatCatalogueList({ beats, playlist }: BeatCatalogueListProps) {
  return (
    <ul className="mt-8 flex flex-col gap-3">
      {beats.map((beat) => (
        <li key={beat.id}>
          <BeatCatalogueCard beat={beat} playlist={playlist} />
        </li>
      ))}
    </ul>
  );
}

function BeatCatalogueCard({
  beat,
  playlist,
}: {
  beat: BeatWithLicenses;
  playlist: PlayerTrack[];
}) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();

  const coverUrl = beat.cover_path
    ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
    : null;
  const track = beatToPlayerTrack(beat);
  const playing = currentTrack?.id === beat.id && isPlaying;
  const licenses = getCatalogueLicenseRows(beat.beat_licenses ?? []);
  const fileLicenses = licenses.filter((license): license is typeof licenses[number] & { type: FileBadgeType } =>
    FILE_BADGE_TYPES.includes(license.type as FileBadgeType),
  );
  const startingPrice = getStartingPriceCents(beat.beat_licenses ?? []);
  const beatHref = `/beats/${beat.slug}`;
  const buyHref = `${beatHref}#licences`;

  const metaLine = [
    beat.genre,
    beat.mood,
    `${beat.bpm} BPM`,
    beat.musical_key,
    formatDuration(beat.duration_seconds),
  ].join(" · ");

  return (
    <article
      className={cn(
        "group rounded-xl border border-border bg-surface p-4 transition-colors",
        "hover:border-gold/25 hover:bg-background/30",
        "md:flex md:items-center md:gap-6 md:p-5",
      )}
    >
      {/* Mobile: cover + title row */}
      <div className="flex items-start gap-3 md:hidden">
        <BeatCover coverUrl={coverUrl} title={beat.title} size="sm" />
        <div className="min-w-0 flex-1">
          <Link
            href={beatHref}
            className="block text-lg font-semibold leading-tight text-foreground transition-colors group-hover:text-gold"
          >
            {beat.title}
          </Link>
          <p className="mt-1 text-sm text-muted">{metaLine}</p>
        </div>
      </div>

      {/* Desktop: left block */}
      <div className="hidden min-w-0 flex-[1.4] items-center gap-4 md:flex">
        <div className="flex shrink-0 items-center gap-2">
          <PlayPreviewButton
            track={track}
            playing={playing}
            onPlay={() => track && playTrack(track, playlist)}
          />
          <FreeDownloadButton
            beatId={beat.id}
            beatSlug={beat.slug}
            beatTitle={beat.title}
            variant="icon"
          />
        </div>

        <BeatCover coverUrl={coverUrl} title={beat.title} size="md" />

        <div className="min-w-0">
          <Link
            href={beatHref}
            className="block truncate text-lg font-semibold text-foreground transition-colors group-hover:text-gold"
          >
            {beat.title}
          </Link>
          <p className="mt-1 truncate text-sm text-muted">{metaLine}</p>
        </div>
      </div>

      {/* Mobile: play + download */}
      <div className="mt-3 flex items-center gap-2 md:hidden">
        <PlayPreviewButton
          track={track}
          playing={playing}
          onPlay={() => track && playTrack(track, playlist)}
        />
        <FreeDownloadButton
          beatId={beat.id}
          beatSlug={beat.slug}
          beatTitle={beat.title}
          variant="icon"
        />
      </div>

      {/* Center: tags + file badges */}
      <div className="mt-4 flex min-w-0 flex-col gap-3 md:mt-0 md:flex-1 md:gap-2.5">
        {beat.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {beat.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border bg-background/60 px-2.5 py-0.5 text-xs text-muted"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="hidden text-xs text-muted md:block">—</p>
        )}

        <div className="flex flex-wrap gap-2">
          {fileLicenses.map((license) => (
            <FileBadge
              key={license.type}
              label={FILE_BADGE_LABELS[license.type]}
              available={license.available}
            />
          ))}
        </div>
      </div>

      {/* Right: price + actions */}
      <div className="mt-4 flex flex-col gap-3 md:mt-0 md:w-52 md:shrink-0 md:items-end">
        <div className="md:text-right">
          {startingPrice !== null ? (
            <p className="whitespace-nowrap text-sm text-muted">
              À partir de{" "}
              <span className="text-lg font-semibold text-gold">
                {formatPrice(startingPrice)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted">Prix sur demande</p>
          )}
        </div>

        <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto md:flex-col">
          <Link
            href={beatHref}
            className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-gold px-4 text-sm font-medium text-background transition-colors hover:bg-gold-muted md:w-40"
          >
            Voir la prod
          </Link>
          {startingPrice !== null ? (
            <Link
              href={buyHref}
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:border-gold/50 hover:text-gold md:w-40"
            >
              Acheter
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function BeatCover({
  coverUrl,
  title,
  size,
}: {
  coverUrl: string | null;
  title: string;
  size: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-14 w-14" : "h-16 w-16";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-border",
        dimension,
      )}
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt={title}
          fill
          className="object-cover"
          sizes={size === "sm" ? "56px" : "64px"}
        />
      ) : (
        <span className="flex h-full items-center justify-center text-muted">
          <Music2 className="h-5 w-5 opacity-40" />
        </span>
      )}
    </div>
  );
}

function PlayPreviewButton({
  track,
  playing,
  onPlay,
}: {
  track: PlayerTrack | null;
  playing: boolean;
  onPlay: () => void;
}) {
  if (!track) {
    return (
      <button
        type="button"
        disabled
        title="Preview indisponible"
        className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border border-border bg-background/60 text-muted opacity-50"
        aria-label="Preview indisponible"
      >
        <Play className="ml-0.5 h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPlay}
      className={cn(
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
        playing
          ? "bg-gold text-background"
          : "border border-border bg-background text-foreground hover:border-gold/40 hover:bg-gold hover:text-background",
      )}
      aria-label={playing ? "Pause" : "Écouter la preview"}
    >
      {playing ? (
        <Pause className="h-4 w-4" />
      ) : (
        <Play className="ml-0.5 h-4 w-4" />
      )}
    </button>
  );
}

function FileBadge({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium uppercase tracking-wide",
        available
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
          : "border-border bg-background/50 text-muted",
      )}
      title={available ? `${label} disponible` : `${label} indisponible`}
    >
      {label}
      {available ? <Check className="h-3 w-3" aria-hidden /> : null}
    </span>
  );
}
