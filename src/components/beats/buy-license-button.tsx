"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import { formatPrice } from "@/lib/utils";

type BuyLicenseButtonProps = {
  beatLicenseId: string;
  licenseType: LicenseType;
  priceCents: number;
  userEmail?: string | null;
};

export function BuyLicenseButton({
  beatLicenseId,
  licenseType,
  priceCents,
  userEmail,
}: BuyLicenseButtonProps) {
  const [email, setEmail] = useState(userEmail ?? "");
  const [showEmail, setShowEmail] = useState(!userEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleBuy() {
    setError(null);

    const checkoutEmail = userEmail ?? email.trim();
    if (!checkoutEmail) {
      setShowEmail(true);
      setError("Indique ton email pour continuer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatLicenseId,
          email: userEmail ? undefined : checkoutEmail,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? "Impossible de démarrer le paiement.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showEmail && !userEmail && (
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ton@email.com"
          className="w-44 text-xs"
          required
        />
      )}
      <Button
        type="button"
        variant="primary"
        disabled={loading}
        onClick={() => void handleBuy()}
        className="px-3 py-1.5 text-xs"
      >
        {loading
          ? "Redirection…"
          : `Acheter ${LICENSE_LABELS[licenseType]} · ${formatPrice(priceCents)}`}
      </Button>
      {error && <p className="max-w-44 text-right text-xs text-red-300">{error}</p>}
    </div>
  );
}
