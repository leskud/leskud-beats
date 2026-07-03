import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseDownloads } from "@/components/orders/purchase-downloads";
import { getPaidOrderItemsBySessionId } from "@/lib/orders/session-lookup";
import { getStripe } from "@/lib/stripe/server";

export const metadata = {
  title: "Paiement confirmé",
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) notFound();

  let paymentConfirmed = false;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paymentConfirmed = session.payment_status === "paid";
  } catch {
    paymentConfirmed = false;
  }

  if (!paymentConfirmed) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Paiement en cours</h1>
        <p className="mt-3 text-sm text-muted">
          Ton paiement n&apos;est pas encore confirmé. Rafraîchis cette page
          dans quelques secondes.
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

  const orderData = await getPaidOrderItemsBySessionId(sessionId);

  if (!orderData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Paiement reçu</h1>
        <p className="mt-3 text-sm text-muted">
          Ton achat est en cours de traitement. Rafraîchis cette page dans
          quelques secondes pour accéder à ton téléchargement.
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

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-semibold">Merci pour ton achat</h1>
      <p className="mt-2 text-sm text-muted">
        Télécharge ta licence ci-dessous. Un email de confirmation a été envoyé
        à {orderData.order.email}.
      </p>

      <div className="mt-8">
        <PurchaseDownloads items={orderData.items} sessionId={sessionId} />
      </div>

      <Link
        href="/account"
        className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
      >
        Voir tous mes achats
      </Link>
    </div>
  );
}
