"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Pause,
  Play,
  Repeat,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { usePlayer } from "@/components/audio/player-provider";
import { FreeDownloadButton } from "@/components/free-download/free-download-button";
import { cn, formatDuration } from "@/lib/utils";

export function GlobalPlayer() {
  const {
    currentTrack,
    isPlaying,
    isShuffle,
    isLoop,
    currentTime,
    duration,
    togglePlay,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleLoop,
    seek,
  } = usePlayer();

  if (!currentTrack) return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 shadow-[0_-8px_32px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="h-0.5 bg-border">
        <div
          className="h-full bg-gold transition-all duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        {/* Piste en cours */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-surface ring-1 ring-border">
            {currentTrack.coverUrl ? (
              <Image
                src={currentTrack.coverUrl}
                alt={currentTrack.title}
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <Link
              href={`/beats/${currentTrack.slug}`}
              className="block truncate text-sm font-medium hover:text-gold"
            >
              {currentTrack.title}
            </Link>
            <p className="truncate text-xs text-muted">
              {currentTrack.bpm} BPM · {currentTrack.musicalKey}
            </p>
          </div>
        </div>

        {/* Contrôles centraux */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleShuffle}
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-surface hover:text-foreground",
                isShuffle ? "text-gold" : "text-muted",
              )}
              aria-label="Lecture aléatoire"
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={playPrevious}
              className="rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
              aria-label="Précédent"
            >
              <SkipBack className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-background shadow-md transition-transform hover:scale-105 hover:bg-gold-muted"
              aria-label={isPlaying ? "Pause" : "Lecture"}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-0.5 h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={playNext}
              className="rounded-full p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
              aria-label="Suivant"
            >
              <SkipForward className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleLoop}
              className={cn(
                "rounded-full p-2 transition-colors hover:bg-surface hover:text-foreground",
                isLoop ? "text-gold" : "text-muted",
              )}
              aria-label="Lecture en boucle"
            >
              <Repeat className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden w-full max-w-md items-center gap-2 sm:flex">
            <span className="w-10 text-right text-xs tabular-nums text-muted">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={(e) => seek(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-gold"
            />
            <span className="w-10 text-xs tabular-nums text-muted">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>

        {/* Download preview */}
        <div className="hidden justify-end sm:flex">
          <FreeDownloadButton
            beatId={currentTrack.id}
            beatSlug={currentTrack.slug}
            beatTitle={currentTrack.title}
            variant="link"
          />
        </div>
      </div>
    </div>
  );
}
