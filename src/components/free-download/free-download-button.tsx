"use client";

import { Download } from "lucide-react";
import { useFreeDownload } from "@/components/free-download/free-download-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FreeDownloadButtonProps = {
  beatId: string;
  beatSlug: string;
  beatTitle: string;
  variant?: "icon" | "button" | "link";
  className?: string;
  label?: string;
};

export function FreeDownloadButton({
  beatId,
  beatSlug,
  beatTitle,
  variant = "button",
  className,
  label = "MP3 tagué (gratuit)",
}: FreeDownloadButtonProps) {
  const { openFreeDownload } = useFreeDownload();

  function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    openFreeDownload({ id: beatId, slug: beatSlug, title: beatTitle });
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-gold/40 hover:text-gold",
          className,
        )}
        aria-label="Télécharger MP3 tagué"
        title="MP3 tagué gratuit"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "rounded-lg border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-gold/40 hover:text-gold",
          className,
        )}
      >
        {label}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      className={cn("inline-flex items-center gap-2", className)}
    >
      <Download className="h-4 w-4" />
      {label}
    </Button>
  );
}
