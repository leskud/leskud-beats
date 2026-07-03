"use client";

import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BeatCatalogueTable } from "@/components/beats/beat-catalogue-table";
import { usePlayer } from "@/components/audio/player-provider";
import { beatsToPlayerTracks } from "@/lib/beats/player";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { BeatWithLicenses } from "@/types/database";

type CatalogueSectionProps = {
  beats: BeatWithLicenses[];
  id?: string;
};

type BpmFilter = "all" | "1-80" | "80-100" | "100-120" | "120-140" | "140+";
type SortOrder = "newest" | "oldest";

function matchesBpm(bpm: number, filter: BpmFilter): boolean {
  switch (filter) {
    case "1-80":
      return bpm <= 80;
    case "80-100":
      return bpm > 80 && bpm <= 100;
    case "100-120":
      return bpm > 100 && bpm <= 120;
    case "120-140":
      return bpm > 120 && bpm <= 140;
    case "140+":
      return bpm > 140;
    default:
      return true;
  }
}

function matchesSearch(beat: BeatWithLicenses, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [
    beat.title,
    beat.slug,
    beat.genre,
    beat.mood,
    beat.musical_key,
    String(beat.bpm),
    ...beat.tags,
  ]
    .join(" ")
    .toLowerCase();

  return q.split(/\s+/).every((term) => haystack.includes(term));
}

export function CatalogueSection({ beats, id = "catalogue" }: CatalogueSectionProps) {
  const { setPlaylist } = usePlayer();
  const [bpmFilter, setBpmFilter] = useState<BpmFilter>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [tagFilter, setTagFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const playlist = useMemo(() => beatsToPlayerTracks(beats), [beats]);

  useEffect(() => {
    setPlaylist(playlist);
  }, [playlist, setPlaylist]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    beats.forEach((beat) => beat.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort();
  }, [beats]);

  const filteredBeats = useMemo(() => {
    let result = beats.filter(
      (beat) => matchesBpm(beat.bpm, bpmFilter) && matchesSearch(beat, searchQuery),
    );

    if (tagFilter) {
      result = result.filter((beat) => beat.tags.includes(tagFilter));
    }

    result = [...result].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    return result;
  }, [beats, bpmFilter, sortOrder, tagFilter, searchQuery]);

  const emptyMessage =
    beats.length === 0
      ? "Aucun beat publié pour le moment."
      : "Aucun résultat pour cette recherche.";

  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold lowercase tracking-tight text-foreground">
              tout les beats leskud
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {filteredBeats.length} instru
              {filteredBeats.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une instru…"
              className="pl-9"
              aria-label="Rechercher une instru"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Select
            value={bpmFilter}
            onChange={(e) => setBpmFilter(e.target.value as BpmFilter)}
            className="sm:w-44"
          >
            <option value="all">Tous les BPM</option>
            <option value="1-80">1–80 BPM</option>
            <option value="80-100">80–100 BPM</option>
            <option value="100-120">100–120 BPM</option>
            <option value="120-140">120–140 BPM</option>
            <option value="140+">140+ BPM</option>
          </Select>

          {allTags.length > 0 && (
            <Select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="sm:w-44"
            >
              <option value="">Tous les tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </Select>
          )}

          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="sm:w-40"
          >
            <option value="newest">Plus récent</option>
            <option value="oldest">Plus ancien</option>
          </Select>
        </div>
      </div>

      {filteredBeats.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border py-20 text-center text-muted">
          {emptyMessage}
        </div>
      ) : (
        <BeatCatalogueTable beats={filteredBeats} playlist={playlist} />
      )}
    </section>
  );
}
