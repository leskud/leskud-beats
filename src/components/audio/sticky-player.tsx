"use client";

import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

type StickyPlayerProps = {
  title?: string;
  isPlaying?: boolean;
  className?: string;
};

export function StickyPlayer({
  title = "Aucun beat en lecture",
  isPlaying = false,
  className,
}: StickyPlayerProps) {
  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface/95 backdrop-blur-md",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          disabled
          className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-background opacity-50"
          aria-label={isPlaying ? "Pause" : "Lecture"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="ml-0.5 h-4 w-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{title}</p>
          <div className="mt-1 h-1 w-full rounded-full bg-border">
            <div className="h-full w-0 rounded-full bg-gold" />
          </div>
        </div>
      </div>
    </div>
  );
}
