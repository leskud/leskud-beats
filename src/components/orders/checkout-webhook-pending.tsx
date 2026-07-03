"use client";

import { useEffect } from "react";
import Link from "next/link";

type CheckoutWebhookPendingProps = {
  sessionId: string;
};

export function CheckoutWebhookPending({
  sessionId,
}: CheckoutWebhookPendingProps) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.location.reload();
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">Paiement reçu</h1>
      <p className="mt-3 text-sm text-muted">
        Ton achat est en cours de finalisation. Cette page se rafraîchit
        automatiquement…
      </p>
      <Link
        href="/account"
        className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
      >
        Mes achats
      </Link>
    </div>
  );
}
