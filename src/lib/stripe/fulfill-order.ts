import "server-only";
import {
  LICENSE_LABELS,
  MAX_DOWNLOADS_PER_PURCHASE,
} from "@/lib/constants";
import { createServiceClient } from "@/lib/supabase/service";
import type { LicenseType } from "@/lib/constants";
import type Stripe from "stripe";

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<{ fulfilled: boolean; reason?: string }> {
  const sessionId = session.id;
  const supabase = createServiceClient();

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existingOrder) {
    return { fulfilled: true, reason: "already_fulfilled" };
  }

  const beatLicenseId = session.metadata?.beat_license_id;
  const beatId = session.metadata?.beat_id;
  const licenseType = session.metadata?.license_type as LicenseType | undefined;
  const userId = session.metadata?.user_id?.trim() || null;

  if (!beatLicenseId || !beatId || !licenseType) {
    return { fulfilled: false, reason: "missing_metadata" };
  }

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.customer_email;

  if (!email) {
    return { fulfilled: false, reason: "missing_email" };
  }

  const { data: license, error: licenseError } = await supabase
    .from("beat_licenses")
    .select(
      "id, beat_id, license_type, price_cents, storage_path, is_available, beats(id, title, status)",
    )
    .eq("id", beatLicenseId)
    .single();

  if (licenseError || !license) {
    return { fulfilled: false, reason: "license_not_found" };
  }

  const beat = license.beats as unknown as {
    id: string;
    title: string;
    status: string;
  };

  if (!beat?.id || beat.id !== beatId) {
    return { fulfilled: false, reason: "beat_mismatch" };
  }

  if (beat.status === "sold_exclusive") {
    return { fulfilled: false, reason: "beat_already_sold" };
  }

  if (
    !license.is_available ||
    !license.storage_path?.trim() ||
    license.license_type !== licenseType
  ) {
    return { fulfilled: false, reason: "license_unavailable" };
  }

  const totalCents = session.amount_total ?? license.price_cents;

  const acceptedAtRaw = session.metadata?.accepted_at;
  const acceptedAt = acceptedAtRaw ? new Date(acceptedAtRaw).toISOString() : null;
  const termsVersion = session.metadata?.terms_version?.trim() || null;
  const licenseVersion = session.metadata?.license_version?.trim() || null;
  const buyerIp = session.metadata?.buyer_ip?.trim() || null;
  const buyerUserAgent = session.metadata?.buyer_user_agent?.trim() || null;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      email: email.toLowerCase(),
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : null,
      status: "paid",
      total_cents: totalCents,
      currency: session.currency ?? "eur",
      paid_at: new Date().toISOString(),
      accepted_terms_at: acceptedAt,
      accepted_license_at: acceptedAt,
      terms_version: termsVersion,
      license_version: licenseVersion,
      buyer_ip: buyerIp || null,
      buyer_user_agent: buyerUserAgent || null,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { fulfilled: false, reason: "order_insert_failed" };
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: order.id,
    beat_id: beatId,
    beat_license_id: beatLicenseId,
    license_type: licenseType,
    price_cents: license.price_cents,
    beat_title: beat.title,
    max_downloads: MAX_DOWNLOADS_PER_PURCHASE,
  });

  if (itemError) {
    return { fulfilled: false, reason: "order_item_insert_failed" };
  }

  if (licenseType === "exclusive") {
    const { error: rpcError } = await supabase.rpc("mark_beat_exclusive_sold", {
      p_beat_id: beatId,
    });

    if (rpcError) {
      return { fulfilled: false, reason: "exclusive_mark_failed" };
    }
  }

  return { fulfilled: true };
}

export function getCheckoutProductName(
  beatTitle: string,
  licenseType: LicenseType,
): string {
  return `${beatTitle} — ${LICENSE_LABELS[licenseType]}`;
}
