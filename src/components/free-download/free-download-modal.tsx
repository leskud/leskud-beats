"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FreeDownloadBeat } from "@/components/free-download/free-download-provider";
import { FREE_PREVIEW_NEWSLETTER_CONSENT_TEXT } from "@/lib/leads/consent";

type SuccessState = {
  emailWarning?: string;
  downloadPath: string;
  previewFilename: string;
};

type FreeDownloadModalProps = {
  beat: FreeDownloadBeat | null;
  isOpen: boolean;
  isSubmitting: boolean;
  isDownloading: boolean;
  error: string | null;
  successState: SuccessState | null;
  defaultEmail: string;
  defaultName: string;
  onClose: () => void;
  onSubmit: (
    email: string,
    name: string,
    marketingConsent: boolean,
  ) => Promise<void>;
  onDownload: () => void;
};

export function FreeDownloadModal({
  beat,
  isOpen,
  isSubmitting,
  isDownloading,
  error,
  successState,
  defaultEmail,
  defaultName,
  onClose,
  onSubmit,
  onDownload,
}: FreeDownloadModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !beat || typeof document === "undefined") return null;

  const isSuccess = successState !== null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-download-title"
    >
      <button
        type="button"
        aria-label="Fermer"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface text-foreground shadow-2xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const email = String(formData.get("email") ?? "");
            const name = String(formData.get("name") ?? "");
            const marketingConsent = formData.get("marketingConsent") === "on";
            void onSubmit(email, name, marketingConsent);
          }}
          className="flex flex-col"
        >
          <div className="border-b border-border px-6 py-5">
            <h2 id="free-download-title" className="text-lg font-semibold">
              {isSuccess ? "Inscription validée." : "Télécharger la preview MP3"}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {beat.title} — preview gratuite avec tag
            </p>
          </div>

          <div className="space-y-4 px-6 py-5">
            {isSuccess ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-gold">
                  Inscription validée. Tu peux télécharger la preview maintenant.
                </div>
                {successState.emailWarning && (
                  <p className="text-sm text-muted">{successState.emailWarning}</p>
                )}
                {isDownloading && (
                  <p className="text-sm text-muted">Téléchargement en cours…</p>
                )}
              </div>
            ) : (
              <>
                {error && (
                  <div className="rounded-lg border border-red-200/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="free-dl-email"
                    className="mb-1.5 block text-sm"
                  >
                    Email <span className="text-gold">*</span>
                  </label>
                  <Input
                    id="free-dl-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    defaultValue={defaultEmail}
                    placeholder="ton@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="free-dl-name" className="mb-1.5 block text-sm">
                    Prénom / pseudo{" "}
                    <span className="text-muted">(optionnel)</span>
                  </label>
                  <Input
                    id="free-dl-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    defaultValue={defaultName}
                    placeholder="Ton pseudo"
                  />
                </div>

                <label className="flex items-start gap-3 text-sm leading-relaxed">
                  <input
                    type="checkbox"
                    name="marketingConsent"
                    required
                    className="mt-1 shrink-0"
                  />
                  <span>{FREE_PREVIEW_NEWSLETTER_CONSENT_TEXT}</span>
                </label>

                <p className="text-xs leading-relaxed text-muted">
                  La preview est disponible juste après inscription.{" "}
                  <Link
                    href="/legal/confidentialite"
                    className="text-gold underline-offset-2 hover:underline"
                    onClick={onClose}
                  >
                    Politique de confidentialité
                  </Link>
                  .
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
            {isSuccess ? (
              <>
                <Button type="button" variant="outline" onClick={onClose}>
                  Fermer
                </Button>
                <Button
                  type="button"
                  onClick={onDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isDownloading ? "Téléchargement…" : "Télécharger la preview"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Inscription…" : "S'inscrire et télécharger"}
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
