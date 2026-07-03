"use client";

import { FreeDownloadButton } from "@/components/free-download/free-download-button";
import type { BeatWithLicenses } from "@/types/database";

export function BeatFreeDownloadButton({ beat }: { beat: BeatWithLicenses }) {
  if (!beat.preview_path) return null;

  return (
    <FreeDownloadButton
      beatId={beat.id}
      beatSlug={beat.slug}
      beatTitle={beat.title}
      label="Télécharger MP3 tagué (gratuit)"
    />
  );
}
