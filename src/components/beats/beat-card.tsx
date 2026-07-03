"use client";

import Image from "next/image";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/audio/player-provider";
import { FreeDownloadButton } from "@/components/free-download/free-download-button";
import { getStartingPriceCents } from "@/lib/beats/pricing";
import { beatToPlayerTrack } from "@/lib/beats/player";
import type { PlayerTrack } from "@/components/audio/player-provider";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { formatDuration, formatPrice, getPublicStorageUrl } from "@/lib/utils";
import type { BeatWithLicenses } from "@/types/database";

type BeatCardProps = {
  beat: BeatWithLicenses;
  playlist?: PlayerTrack[];
};

export function BeatCard({ beat, playlist }: BeatCardProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const coverUrl = beat.cover_path
    ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
    : null;

  const startingPrice = getStartingPriceCents(beat.beat_licenses ?? []);
  const track = beatToPlayerTrack(beat);
  const playing = currentTrack?.id === beat.id && isPlaying;

  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-surface transition-all hover:border-gold/40 hover:shadow-lg hover:shadow-black/20">
      <div className="relative aspect-square overflow-hidden bg-background">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={beat.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted">
            —
          </div>
        )}

        <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
          {track && (
            <>
              <button
                type="button"
                onClick={() => playTrack(track, playlist)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-background shadow-lg"
                aria-label={playing ? "Pause" : "Écouter"}
              >
                {playing ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="ml-0.5 h-4 w-4" />
                )}
              </button>
              <FreeDownloadButton
                beatId={beat.id}
                beatSlug={beat.slug}
                beatTitle={beat.title}
                variant="icon"
                className="h-10 w-10 border-white/20 bg-black/40 text-white backdrop-blur-sm hover:border-white/20 hover:bg-gold hover:text-background"
              />
            </>
          )}
        </div>
      </div>

      <Link href={`/beats/${beat.slug}`} className="block p-4">
        <h3 className="truncate font-medium group-hover:text-gold">
          {beat.title}
        </h3>
        <p className="mt-1 truncate text-sm text-muted">
          {beat.genre} · {beat.mood}
        </p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-muted">
            {beat.bpm} BPM · {beat.musical_key} ·{" "}
            {formatDuration(beat.duration_seconds)}
          </span>
          {startingPrice !== null && (
            <span className="font-medium text-gold">
              {formatPrice(startingPrice)}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
