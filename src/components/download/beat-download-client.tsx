"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { LeskudLogo } from "@/components/brand/leskud-logo";
import { buildPreviewDownloadFilename } from "@/lib/orders/download-filename";
import { buildFreeDownloadFileQuery } from "@/lib/leads/download-token-query";
import { triggerFileDownload } from "@/lib/leads/client";
import { Button } from "@/components/ui/button";

type BeatDownloadClientProps = {
  beatId: string;
  beatTitle: string;
  beatSlug: string;
  email: string;
  token: string;
  exp: number;
};

export function BeatDownloadClient({
  beatId,
  beatTitle,
  beatSlug,
  email,
  token,
  exp,
}: BeatDownloadClientProps) {
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const filename = buildPreviewDownloadFilename(beatTitle);
  const downloadPath = buildFreeDownloadFileQuery(beatId, email, token, exp);

  async function startDownload() {
    setStatus("loading");
    try {
      await triggerFileDownload(downloadPath, filename);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    void startDownload();
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="flex justify-center">
        <LeskudLogo href={null} size="lg" shimmer />
      </div>
      <h1 className="mt-6 text-2xl font-semibold">{beatTitle}</h1>
      <p className="mt-1 text-sm text-muted">MP3 tagué</p>

      <div className="mt-10 rounded-xl border border-border bg-surface p-8">
        {status === "loading" && (
          <p className="text-sm text-muted">Téléchargement en cours…</p>
        )}
        {status === "done" && (
          <p className="text-sm text-gold">
            Téléchargement lancé. Vérifie ton dossier Téléchargements.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-300">
            Le téléchargement automatique a échoué. Clique ci-dessous.
          </p>
        )}

        <Button
          type="button"
          onClick={() => void startDownload()}
          className="mt-6 inline-flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Télécharger le MP3
        </Button>
      </div>
    </div>
  );
}
