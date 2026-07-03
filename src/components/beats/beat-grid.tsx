import { Music2 } from "lucide-react";
import { BeatCard } from "@/components/beats/beat-card";
import type { BeatWithLicenses } from "@/types/database";

type BeatGridProps = {
  beats: BeatWithLicenses[];
  emptyMessage?: string;
};

export function BeatGrid({
  beats,
  emptyMessage = "Aucun beat publié pour le moment.",
}: BeatGridProps) {
  if (beats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
        <Music2 className="h-12 w-12 text-muted" />
        <p className="mt-4 text-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {beats.map((beat) => (
        <BeatCard key={beat.id} beat={beat} />
      ))}
    </div>
  );
}
