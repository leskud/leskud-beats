"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import {
  LicenseAcceptanceCheckbox,
  LICENSE_VERSION,
  TERMS_VERSION,
} from "@/components/licenses/license-acceptance-checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCartTotalCents } from "@/lib/cart/storage";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { formatPrice, getPublicStorageUrl } from "@/lib/utils";

type CartPageClientProps = {
  userEmail?: string | null;
};

export function CartPageClient({ userEmail }: CartPageClientProps) {
  const { items, removeItem, isHydrated } = useCart();
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedImmediateAccess, setAcceptedImmediateAccess] = useState(false);
  const [email, setEmail] = useState(userEmail ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCents = useMemo(() => getCartTotalCents(items), [items]);
  const acceptanceComplete = acceptedTerms && acceptedImmediateAccess;

  async function handleCheckout() {
    setError(null);

    if (items.length === 0) {
      setError("Ton panier est vide.");
      return;
    }

    if (!acceptanceComplete) {
      setError("Tu dois accepter les deux conditions avant le paiement.");
      return;
    }

    const checkoutEmail = userEmail ?? email.trim();
    if (!checkoutEmail) {
      setError("Indique ton email pour continuer.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            beatLicenseId: item.beatLicenseId,
          })),
          email: userEmail ? undefined : checkoutEmail,
          acceptedTerms: true,
          acceptedImmediateAccess: true,
          termsVersion: TERMS_VERSION,
          licenseVersion: LICENSE_VERSION,
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

  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <p className="text-sm text-muted">Chargement du panier…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold">Panier</h1>
        <p className="mt-4 text-muted">Ton panier est vide.</p>
        <Link
          href="/#catalogue"
          className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-gold px-5 text-sm font-medium text-background transition-colors hover:bg-gold-muted"
        >
          Voir les beats
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">Panier</h1>
      <p className="mt-2 text-sm text-muted">
        {items.length} article{items.length > 1 ? "s" : ""}
      </p>

      <ul className="mt-8 space-y-4">
        {items.map((item) => {
          const coverUrl = item.coverPath
            ? getPublicStorageUrl(STORAGE_BUCKETS.covers, item.coverPath)
            : null;

          return (
            <li
              key={item.beatId}
              className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-background ring-1 ring-border">
                  {coverUrl ? (
                    <Image
                      src={coverUrl}
                      alt={item.beatTitle}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/beats/${item.beatSlug}`}
                    className="font-medium hover:text-gold"
                  >
                    {item.beatTitle}
                  </Link>
                  <p className="mt-1 text-sm text-gold">{item.licenseLabel}</p>
                  <p className="mt-1 text-xs text-muted">
                    {item.filesIncluded.join(" · ")}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <p className="font-semibold text-gold">
                  {formatPrice(item.priceCents)}
                </p>
                <button
                  type="button"
                  onClick={() => removeItem(item.beatId)}
                  className="inline-flex items-center gap-1 text-xs text-muted transition-colors hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Supprimer
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 space-y-6 rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Total</span>
          <span className="text-gold">{formatPrice(totalCents)}</span>
        </div>

        {!userEmail ? (
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="ton@email.com"
            required
          />
        ) : null}

        <LicenseAcceptanceCheckbox
          acceptedTerms={acceptedTerms}
          acceptedImmediateAccess={acceptedImmediateAccess}
          onAcceptedTermsChange={setAcceptedTerms}
          onAcceptedImmediateAccessChange={setAcceptedImmediateAccess}
        />

        <Button
          type="button"
          variant="primary"
          disabled={loading || !acceptanceComplete}
          className="w-full"
          onClick={() => void handleCheckout()}
        >
          {loading ? "Redirection…" : "Passer au paiement"}
        </Button>

        {error ? <p className="text-sm text-red-300">{error}</p> : null}
      </div>
    </div>
  );
}
