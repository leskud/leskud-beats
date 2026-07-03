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

export function FreeDownloadProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [beat, setBeat] = useState<FreeDownloadBeat | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [defaultEmail, setDefaultEmail] = useState("");
  const [defaultName, setDefaultName] = useState("");

  useEffect(() => {
    captureUtmFromUrl();
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
    setSuccessMessage(null);
  }, []);

  const submitDownload = useCallback(
    async (email: string, name: string, marketingConsent: boolean) => {
      if (!beat) return;

      setIsSubmitting(true);
      setError(null);
      setSuccessMessage(null);

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
        };

        if (!response.ok || data.error || !data.emailSent) {
          setError(data.error ?? "Envoi impossible. Réessayez.");
          return;
        }

        storeLeadIdentity(email, name);

        setSuccessMessage(
          `Un email avec le lien de téléchargement vient d'être envoyé à ${email}. Vérifie ta boîte mail (et les spams).`,
        );
      } catch {
        setError("Erreur réseau. Réessayez.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [beat],
  );

  const openFreeDownload = useCallback((nextBeat: FreeDownloadBeat) => {
    const stored = getStoredLeadIdentity();
    setDefaultEmail(stored.email ?? "");
    setDefaultName(stored.name ?? "");
    setBeat(nextBeat);
    setError(null);
    setSuccessMessage(null);
    setIsOpen(true);
  }, []);

  return (
    <FreeDownloadContext.Provider value={{ openFreeDownload }}>
      {children}
      <FreeDownloadModal
        beat={beat}
        isOpen={isOpen}
        isSubmitting={isSubmitting}
        error={error}
        successMessage={successMessage}
        defaultEmail={defaultEmail}
        defaultName={defaultName}
        onClose={close}
        onSubmit={submitDownload}
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
