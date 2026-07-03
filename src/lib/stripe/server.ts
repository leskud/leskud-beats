import Stripe from "stripe";
import { getStripeConfig } from "@/lib/config/env";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const { secretKey } = getStripeConfig();

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY non configurée.");
  }

  if (!stripe) {
    stripe = new Stripe(secretKey);
  }

  return stripe;
}

export function getStripeWebhookSecret(): string {
  const { webhookSecret } = getStripeConfig();

  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET non configuré.");
  }

  return webhookSecret;
}
