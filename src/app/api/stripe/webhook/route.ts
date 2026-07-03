import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill-order";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Signature manquante." }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    const body = await request.text();
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook invalide.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not_paid" });
    }

    const result = await fulfillCheckoutSession(session);

    if (!result.fulfilled) {
      console.error("[stripe/webhook] fulfill failed:", result.reason, session.id);
      return NextResponse.json(
        { error: result.reason ?? "fulfillment_failed" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
