"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  deleteBeat,
  updateBeatStatus,
} from "@/lib/admin/actions";
import {
  NO_PREVIEW_PLAYER_MESSAGE,
  PREVIEW_GENERATED_MESSAGE,
} from "@/lib/audio/preview-messages";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { formatDuration, getPublicStorageUrl } from "@/lib/utils";
import type { Beat } from "@/types/database";
import { Button } from "@/components/ui/button";

type BeatListProps = {
  beats: Beat[];
};

const STATUS_LABELS: Record<Beat["status"], string> = {
  draft: "Brouillon",
  published: "Publié",
  sold_exclusive: "Exclusive vendu",
};

const STATUS_STYLES: Record<Beat["status"], string> = {
  draft: "bg-zinc-500/20 text-zinc-300",
  published: "bg-green-500/20 text-green-300",
  sold_exclusive: "bg-gold/20 text-gold",
};

export function BeatList({ beats }: BeatListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRegeneratePreview(beatId: string) {
    startTransition(async () => {
      const response = await fetch(`/api/admin/beats/${beatId}/preview`, {
        method: "POST",
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        previewMessage?: string | null;
      } | null;

      if (!response.ok || result?.error) {
        alert(result?.error ?? "Impossible de régénérer la preview.");
        return;
      }
      router.refresh();
      alert(result?.previewMessage ?? PREVIEW_GENERATED_MESSAGE);
    });
  }

  function handleStatusChange(beatId: string, status: "draft" | "published") {
    startTransition(async () => {
      await updateBeatStatus(beatId, status);
    });
  }

  function handleDelete(beatId: string, title: string) {
    if (!confirm(`Supprimer « ${title} » ? Cette action est irréversible.`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteBeat(beatId);
      if (result?.error) alert(result.error);
    });
  }

  if (beats.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-muted">
        Aucun beat pour le moment. Ajoutez votre premier beat.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {beats.map((beat) => {
        const coverUrl = beat.cover_path
          ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
          : null;

        return (
          <div
            key={beat.id}
            className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background">
                {coverUrl ? (
                  <Image
                    src={coverUrl}
                    alt={beat.title}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted">
                    —
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate font-medium">{beat.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[beat.status]}`}
                  >
                    {STATUS_LABELS[beat.status]}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {beat.genre} · {beat.bpm} BPM · {beat.musical_key} ·{" "}
                  {formatDuration(beat.duration_seconds)}
                </p>
                <p className="text-xs text-muted">/{beat.slug}</p>
                {beat.status === "published" && !beat.preview_path ? (
                  <p className="mt-1 text-xs text-gold">
                    {NO_PREVIEW_PLAYER_MESSAGE}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleRegeneratePreview(beat.id)}
              >
                Régénérer preview
              </Button>
              <Link href={`/admin/beats/${beat.id}/edit`}>
                <Button type="button" variant="outline" disabled={isPending}>
                  Modifier
                </Button>
              </Link>
              <Link href={`/admin/beats/${beat.id}/edit#reanalyze`}>
                <Button type="button" variant="outline" disabled={isPending}>
                  Ré-analyser
                </Button>
              </Link>
              {beat.status === "draft" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleStatusChange(beat.id, "published")}
                >
                  Publier
                </Button>
              )}
              {beat.status === "published" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleStatusChange(beat.id, "draft")}
                >
                  Dépublier
                </Button>
              )}
              {beat.status !== "sold_exclusive" && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(beat.id, beat.title)}
                  className="text-red-400 hover:text-red-300"
                >
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
