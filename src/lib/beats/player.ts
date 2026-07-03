import { STORAGE_BUCKETS } from "@/lib/constants";
import { getPublicStorageUrl } from "@/lib/utils";
import type { BeatWithLicenses } from "@/types/database";
import type { PlayerTrack } from "@/components/audio/player-provider";

export function beatToPlayerTrack(beat: BeatWithLicenses): PlayerTrack | null {
  if (!beat.preview_path) return null;

  const previewUrl = getPublicStorageUrl(
    STORAGE_BUCKETS.previews,
    beat.preview_path,
    beat.updated_at,
  );

  return {
    id: beat.id,
    slug: beat.slug,
    title: beat.title,
    bpm: beat.bpm,
    musicalKey: beat.musical_key,
    coverUrl: beat.cover_path
      ? getPublicStorageUrl(STORAGE_BUCKETS.covers, beat.cover_path)
      : null,
    previewUrl,
    downloadUrl: previewUrl,
  };
}

export function beatsToPlayerTracks(
  beats: BeatWithLicenses[],
): PlayerTrack[] {
  return beats
    .map(beatToPlayerTrack)
    .filter((track): track is PlayerTrack => track !== null);
}

export function getPreviewDownloadUrl(beat: BeatWithLicenses): string | null {
  if (!beat.preview_path) return null;
  return getPublicStorageUrl(
    STORAGE_BUCKETS.previews,
    beat.preview_path,
    beat.updated_at,
  );
}
