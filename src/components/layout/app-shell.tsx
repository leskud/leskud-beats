"use client";

import { GlobalPlayer } from "@/components/audio/global-player";
import { PlayerProvider } from "@/components/audio/player-provider";
import { FreeDownloadProvider } from "@/components/free-download/free-download-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <FreeDownloadProvider>
        <div className="pb-24">{children}</div>
        <GlobalPlayer />
      </FreeDownloadProvider>
    </PlayerProvider>
  );
}
