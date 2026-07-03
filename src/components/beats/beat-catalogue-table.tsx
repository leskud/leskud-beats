"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Music2, Pause, Play, X } from "lucide-react";
import { usePlayer } from "@/components/audio/player-provider";
import { FreeDownloadButton } from "@/components/free-download/free-download-button";
import type { PlayerTrack } from "@/components/audio/player-provider";
import { getCatalogueLicenseRows } from "@/lib/beats/licenses";
import { getStartingPriceCents } from "@/lib/beats/pricing";
import { beatToPlayerTrack } from "@/lib/beats/player";
import { LICENSE_LABELS } from "@/lib/constants";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { cn, formatDuration, formatPrice, getPublicStorageUrl } from "@/lib/utils";
import type { BeatWithLicenses } from "@/types/database";

type BeatCatalogueTableProps = {
  beats: BeatWithLicenses[];
  playlist: PlayerTrack[];
};

export function BeatCatalogueTable({ beats, playlist }: BeatCatalogueTableProps) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();

  return (
    <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <th className="px-3 py-3 font-medium" scope="col">
                <span className="sr-only">Actions</span>
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Beat
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Genre
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Mood
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                BPM
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Clé
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Durée
              </th>
              <th className="px-3 py-3 font-medium" scope="col">
                Tags
              </th>
              <th className="px-3 py-3 text-center font-medium" scope="col">
                MP3
              </th>
              <th className="px-3 py-3 text-center font-medium" scope="col">
                WAV
              </th>
              <th className="px-3 py-3 text-center font-medium" scope="col">
                Stems
              </th>
              <th className="px-3 py-3 text-right font-medium" scope="col">
                À partir de
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {beats.map((beat) => {
              const coverUrl = beat.cover_path
                ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
                : null;
              const track = beatToPlayerTrack(beat);
              const playing = currentTrack?.id === beat.id && isPlaying;
              const licenses = getCatalogueLicenseRows(beat.beat_licenses ?? []);
              const startingPrice = getStartingPriceCents(
                beat.beat_licenses ?? [],
              );

              return (
                <tr
                  key={beat.id}
                  className="group transition-colors hover:bg-background/40"
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {track && (
                        <>
                          <button
                            type="button"
                            onClick={() => playTrack(track, playlist)}
                            className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                              playing
                                ? "bg-gold text-background"
                                : "bg-background text-foreground hover:bg-gold hover:text-background",
                            )}
                            aria-label={playing ? "Pause" : "Écouter"}
                          >
                            {playing ? (
                              <Pause className="h-3.5 w-3.5" />
                            ) : (
                              <Play className="ml-0.5 h-3.5 w-3.5" />
                            )}
                          </button>
                          <FreeDownloadButton
                            beatId={beat.id}
                            beatSlug={beat.slug}
                            beatTitle={beat.title}
                            variant="icon"
                          />
                        </>
                      )}
                    </div>
                  </td>

                  <td className="px-3 py-3">
                    <Link
                      href={`/beats/${beat.slug}`}
                      className="flex items-center gap-3 min-w-[180px]"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-background ring-1 ring-border">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-muted">
                            <Music2 className="h-4 w-4 opacity-40" />
                          </span>
                        )}
                      </div>
                      <span className="font-medium group-hover:text-gold">
                        {beat.title}
                      </span>
                    </Link>
                  </td>

                  <td className="px-3 py-3 text-muted">{beat.genre}</td>
                  <td className="px-3 py-3 text-muted">{beat.mood}</td>
                  <td className="px-3 py-3 tabular-nums">{beat.bpm}</td>
                  <td className="px-3 py-3">{beat.musical_key}</td>
                  <td className="px-3 py-3 tabular-nums text-muted">
                    {formatDuration(beat.duration_seconds)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex max-w-[140px] flex-wrap gap-1">
                      {beat.tags.length > 0 ? (
                        beat.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-background px-2 py-0.5 text-xs text-muted"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </div>
                  </td>

                  {licenses.map((license) => (
                    <td key={license.type} className="px-3 py-3 text-center">
                      <LicenseCell license={license} />
                    </td>
                  ))}

                  <td className="px-3 py-3 text-right font-medium text-gold">
                    {startingPrice !== null
                      ? formatPrice(startingPrice)
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LicenseCell({
  license,
}: {
  license: ReturnType<typeof getCatalogueLicenseRows>[number];
}) {
  const label = LICENSE_LABELS[license.type];

  if (!license.available) {
    return (
      <span
        className="inline-flex items-center justify-center"
        title={`${label} indisponible`}
      >
        <X className="h-4 w-4 text-red-400" aria-label={`${label} indisponible`} />
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center"
      title={`${label} disponible`}
    >
      <Check
        className="h-4 w-4 text-emerald-400"
        aria-label={`${label} disponible`}
      />
    </span>
  );
}
