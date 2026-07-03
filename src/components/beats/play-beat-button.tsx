"use client";

import { Pause, Play } from "lucide-react";
import { usePlayer } from "@/components/audio/player-provider";
import { beatToPlayerTrack } from "@/lib/beats/player";
import type { BeatWithLicenses } from "@/types/database";
import { Button } from "@/components/ui/button";

export function PlayBeatButton({ beat }: { beat: BeatWithLicenses }) {
  const { currentTrack, isPlaying, playTrack } = usePlayer();
  const track = beatToPlayerTrack(beat);

  if (!track) return null;

  const playing = currentTrack?.id === beat.id && isPlaying;

  return (
    <Button
      type="button"
      onClick={() => playTrack(track)}
      className="inline-flex items-center gap-2"
    >
      {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      {playing ? "Pause" : "Écouter la preview"}
    </Button>
  );
}
