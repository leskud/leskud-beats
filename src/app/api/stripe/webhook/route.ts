import { NextResponse } from "next/server";
import { fulfillCheckoutSession } from "@/lib/stripe/fulfill-order";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe/server";
import type Stripe from "stripe";

export const runtime = "nodejs";

const NON_RETRYABLE_REASONS = new Set([
  "missing_metadata",
  "missing_email",
  "license_not_found",
  "beat_mismatch",
  "license_type_mismatch",
  "beat_not_purchasable",
]);

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

    console.info(
      "[stripe/webhook] checkout.session.completed",
      JSON.stringify({
        sessionId: session.id,
        paymentStatus: session.payment_status,
        beatLicenseId: session.metadata?.beat_license_id,
        beatId: session.metadata?.beat_id,
        licenseType: session.metadata?.license_type,
      }),
    );

    if (session.payment_status !== "paid") {
      return NextResponse.json({ received: true, skipped: "not_paid" });
    }

    const result = await fulfillCheckoutSession(session);

    if (!result.fulfilled) {
      console.error(
        "[stripe/webhook] fulfill failed",
        JSON.stringify({
          sessionId: session.id,
          reason: result.reason,
          beatLicenseId: session.metadata?.beat_license_id,
          beatId: session.metadata?.beat_id,
          licenseType: session.metadata?.license_type,
        }),
      );

      const status = NON_RETRYABLE_REASONS.has(result.reason ?? "")
        ? 200
        : 500;

      return NextResponse.json(
        {
          received: status === 200,
          error: result.reason ?? "fulfillment_failed",
          retry: status === 500,
        },
        { status },
      );
    }

    console.info(
      "[stripe/webhook] fulfill success",
      JSON.stringify({
        sessionId: session.id,
        reason: result.reason,
        orderId: result.orderId,
      }),
    );
  }

  return NextResponse.json({ received: true });
}
