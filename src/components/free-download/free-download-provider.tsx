"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { FreeDownloadModal } from "@/components/free-download/free-download-modal";
import {
  captureUtmFromUrl,
  getStoredLeadIdentity,
  getStoredReferrer,
  getStoredUtmParams,
  storeLeadIdentity,
  triggerFileDownload,
} from "@/lib/leads/client";

export type FreeDownloadBeat = {
  id: string;
  slug: string;
  title: string;
};

type FreeDownloadContextValue = {
  openFreeDownload: (beat: FreeDownloadBeat) => void;
};

const FreeDownloadContext = createContext<FreeDownloadContextValue | null>(null);

type SuccessState = {
  emailWarning?: string;
  downloadPath: string;
  previewFilename: string;
};

export function FreeDownloadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [beat, setBeat] = useState<FreeDownloadBeat | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successState, setSuccessState] = useState<SuccessState | null>(null);
  const [defaultEmail, setDefaultEmail] = useState("");
  const [defaultName, setDefaultName] = useState("");

  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setSuccessState(null);
    setIsDownloading(false);
  }, []);

  const startDownload = useCallback(
    async (downloadPath: string, previewFilename: string) => {
      setIsDownloading(true);
      try {
        await triggerFileDownload(downloadPath, previewFilename);
      } catch {
        setError("Le téléchargement a échoué. Réessayez avec le bouton ci-dessous.");
      } finally {
        setIsDownloading(false);
      }
    },
    [],
  );

  const submitDownload = useCallback(
    async (email: string, name: string, marketingConsent: boolean) => {
      if (!beat) return;

      setIsSubmitting(true);
      setError(null);
      setSuccessState(null);

      const utm = getStoredUtmParams();

      try {
        const response = await fetch("/api/free-download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            name: name || undefined,
            marketingConsent,
            beatId: beat.id,
            ...utm,
            referrer: getStoredReferrer(),
          }),
        });

        const data = (await response.json()) as {
          error?: string;
          emailSent?: boolean;
          emailWarning?: string;
          downloadPath?: string;
          previewFilename?: string;
        };

        if (!response.ok || data.error || !data.downloadPath || !data.previewFilename) {
          setError(data.error ?? "Inscription impossible. Réessayez.");
          return;
        }

        storeLeadIdentity(email, name);

        const nextSuccess: SuccessState = {
          emailWarning: data.emailWarning,
          downloadPath: data.downloadPath,
          previewFilename: data.previewFilename,
        };
        setSuccessState(nextSuccess);
        void startDownload(data.downloadPath, data.previewFilename);
      } catch {
        setError("Erreur réseau. Réessayez.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [beat, startDownload],
  );

  const openFreeDownload = useCallback((nextBeat: FreeDownloadBeat) => {
    const stored = getStoredLeadIdentity();
    setDefaultEmail(stored.email ?? "");
    setDefaultName(stored.name ?? "");
    setBeat(nextBeat);
    setError(null);
    setSuccessState(null);
    setIsOpen(true);
  }, []);

  return (
    <FreeDownloadContext.Provider value={{ openFreeDownload }}>
      {children}
      <FreeDownloadModal
        beat={beat}
        isOpen={isOpen}
        isSubmitting={isSubmitting}
        isDownloading={isDownloading}
        error={error}
        successState={successState}
        defaultEmail={defaultEmail}
        defaultName={defaultName}
        onClose={close}
        onSubmit={submitDownload}
        onDownload={() => {
          if (!successState) return;
          void startDownload(successState.downloadPath, successState.previewFilename);
        }}
      />
    </FreeDownloadContext.Provider>
  );
}

export function useFreeDownload() {
  const context = useContext(FreeDownloadContext);
  if (!context) {
    throw new Error(
      "useFreeDownload doit être utilisé dans FreeDownloadProvider",
    );
  }
  return context;
}
