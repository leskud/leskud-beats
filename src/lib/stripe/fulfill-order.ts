import "server-only";
import {
  LICENSE_LABELS,
  MAX_DOWNLOADS_PER_PURCHASE,
} from "@/lib/constants";
import { getExclusivePurchaseBlockState } from "@/lib/beats/exclusive-guard";
import { createServiceClient } from "@/lib/supabase/service";
import type { LicenseType } from "@/lib/constants";
import type Stripe from "stripe";

export type FulfillResult = {
  fulfilled: boolean;
  reason?: string;
  orderId?: string;
};

function logFulfill(
  level: "info" | "error" | "warn",
  message: string,
  context: Record<string, unknown>,
) {
  const payload = JSON.stringify(context);
  if (level === "error") {
    console.error(`[fulfill-order] ${message}`, payload);
  } else if (level === "warn") {
    console.warn(`[fulfill-order] ${message}`, payload);
  } else {
    console.info(`[fulfill-order] ${message}`, payload);
  }
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillResult> {
  const sessionId = session.id;
  const supabase = createServiceClient();

  const beatLicenseId = session.metadata?.beat_license_id;
  const beatId = session.metadata?.beat_id;
  const licenseType = session.metadata?.license_type as LicenseType | undefined;
  const userId = session.metadata?.user_id?.trim() || null;

  const logContext = {
    sessionId,
    beatLicenseId,
    beatId,
    licenseType,
    paymentStatus: session.payment_status,
  };

  logFulfill("info", "start", logContext);

  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existingOrder) {
    logFulfill("info", "already_fulfilled", {
      ...logContext,
      orderId: existingOrder.id,
    });
    return { fulfilled: true, reason: "already_fulfilled", orderId: existingOrder.id };
  }

  if (!beatLicenseId || !beatId || !licenseType) {
    logFulfill("error", "missing_metadata", logContext);
    return { fulfilled: false, reason: "missing_metadata" };
  }

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.customer_email;

  if (!email) {
    logFulfill("error", "missing_email", logContext);
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
    logFulfill("error", "license_not_found", {
      ...logContext,
      licenseError: licenseError?.message,
    });
    return { fulfilled: false, reason: "license_not_found" };
  }

  const beat = license.beats as unknown as {
    id: string;
    title: string;
    status: string;
  };

  if (!beat?.id || beat.id !== beatId) {
    logFulfill("error", "beat_mismatch", {
      ...logContext,
      licenseBeatId: license.beat_id,
      beatStatus: beat?.status,
    });
    return { fulfilled: false, reason: "beat_mismatch" };
  }

  if (license.license_type !== licenseType) {
    logFulfill("error", "license_type_mismatch", {
      ...logContext,
      licenseRowType: license.license_type,
    });
    return { fulfilled: false, reason: "license_type_mismatch" };
  }

  if (beat.status === "draft") {
    logFulfill("error", "beat_not_purchasable", {
      ...logContext,
      beatStatus: beat.status,
    });
    return { fulfilled: false, reason: "beat_not_purchasable" };
  }

  if (licenseType === "exclusive") {
    const { blocked } = await getExclusivePurchaseBlockState(beatId, beat.status);

    if (blocked) {
      logFulfill("warn", "exclusive_already_sold", {
        ...logContext,
        beatStatus: beat.status,
      });
      return { fulfilled: false, reason: "exclusive_already_sold" };
    }
  }

  const totalCents = session.amount_total ?? license.price_cents;

  const acceptedAtRaw = session.metadata?.accepted_at;
  const acceptedAt = acceptedAtRaw
    ? new Date(acceptedAtRaw).toISOString()
    : null;
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

  if (orderError) {
    if (orderError.code === "23505") {
      logFulfill("info", "already_fulfilled_race", {
        ...logContext,
        orderError: orderError.message,
      });
      return { fulfilled: true, reason: "already_fulfilled" };
    }

    logFulfill("error", "order_insert_failed", {
      ...logContext,
      orderError: orderError.message,
    });
    return { fulfilled: false, reason: "order_insert_failed" };
  }

  if (!order) {
    logFulfill("error", "order_insert_failed", logContext);
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
    logFulfill("error", "order_item_insert_failed", {
      ...logContext,
      orderId: order.id,
      itemError: itemError.message,
    });
    return { fulfilled: false, reason: "order_item_insert_failed" };
  }

  if (licenseType === "exclusive") {
    const { error: rpcError } = await supabase.rpc("mark_beat_exclusive_sold", {
      p_beat_id: beatId,
    });

    if (rpcError) {
      logFulfill("warn", "exclusive_mark_failed", {
        ...logContext,
        orderId: order.id,
        rpcError: rpcError.message,
      });
    } else {
      logFulfill("info", "exclusive_marked_sold", {
        ...logContext,
        orderId: order.id,
      });
    }
  }

  logFulfill("info", "fulfilled", {
    ...logContext,
    orderId: order.id,
    beatStatus: beat.status,
    licenseWasAvailable: license.is_available,
  });

  return { fulfilled: true, orderId: order.id };
}

export function getCheckoutProductName(
  beatTitle: string,
  licenseType: LicenseType,
): string {
  return `${beatTitle} — ${LICENSE_LABELS[licenseType]}`;
}
