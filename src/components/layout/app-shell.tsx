"use client";

import { GlobalPlayer } from "@/components/audio/global-player";
import { PlayerProvider } from "@/components/audio/player-provider";
import { CartProvider } from "@/components/cart/cart-provider";
import { FreeDownloadProvider } from "@/components/free-download/free-download-provider";

export function AppShell({
  children,
  isAuthenticated = false,
}: {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}) {
  return (
    <PlayerProvider>
      <CartProvider isAuthenticated={isAuthenticated}>
        <FreeDownloadProvider>
          <div className="flex min-h-full flex-1 flex-col pb-24">{children}</div>
          <GlobalPlayer />
        </FreeDownloadProvider>
      </CartProvider>
    </PlayerProvider>
  );
}
