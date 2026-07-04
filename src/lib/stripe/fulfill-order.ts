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

type CartLineMeta = {
  i: string;
  b: string;
  t: string;
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

function parseCartItems(metadata: Stripe.Metadata): CartLineMeta[] | null {
  const raw = metadata.cart_items?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const items = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const row = entry as Record<string, unknown>;
        if (
          typeof row.i !== "string" ||
          typeof row.b !== "string" ||
          typeof row.t !== "string"
        ) {
          return null;
        }
        return { i: row.i, b: row.b, t: row.t };
      })
      .filter((entry): entry is CartLineMeta => entry !== null);

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

async function fulfillSingleLicenseItem(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  beatLicenseId: string,
  beatId: string,
  licenseType: LicenseType,
  logContext: Record<string, unknown>,
): Promise<FulfillResult> {
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
      beatLicenseId,
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
      beatLicenseId,
      licenseBeatId: license.beat_id,
      beatStatus: beat?.status,
    });
    return { fulfilled: false, reason: "beat_mismatch" };
  }

  if (license.license_type !== licenseType) {
    logFulfill("error", "license_type_mismatch", {
      ...logContext,
      beatLicenseId,
      licenseRowType: license.license_type,
    });
    return { fulfilled: false, reason: "license_type_mismatch" };
  }

  if (beat.status === "draft") {
    logFulfill("error", "beat_not_purchasable", {
      ...logContext,
      beatLicenseId,
      beatStatus: beat.status,
    });
    return { fulfilled: false, reason: "beat_not_purchasable" };
  }

  if (licenseType === "exclusive") {
    const { blocked } = await getExclusivePurchaseBlockState(beatId, beat.status);

    if (blocked) {
      logFulfill("warn", "exclusive_already_sold", {
        ...logContext,
        beatLicenseId,
        beatStatus: beat.status,
      });
      return { fulfilled: false, reason: "exclusive_already_sold" };
    }
  }

  const { error: itemError } = await supabase.from("order_items").insert({
    order_id: orderId,
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
      orderId,
      beatLicenseId,
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
        orderId,
        beatLicenseId,
        rpcError: rpcError.message,
      });
    } else {
      logFulfill("info", "exclusive_marked_sold", {
        ...logContext,
        orderId,
        beatLicenseId,
      });
    }
  }

  return { fulfilled: true, orderId };
}

export async function fulfillCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillResult> {
  const sessionId = session.id;
  const supabase = createServiceClient();

  const logContext = {
    sessionId,
    paymentStatus: session.payment_status,
    checkoutMode: session.metadata?.checkout_mode,
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

  const email =
    session.customer_details?.email ??
    session.customer_email ??
    session.metadata?.customer_email;

  if (!email) {
    logFulfill("error", "missing_email", logContext);
    return { fulfilled: false, reason: "missing_email" };
  }

  const cartItems = parseCartItems(session.metadata ?? {});
  const itemsToFulfill: CartLineMeta[] =
    cartItems ??
    (session.metadata?.beat_license_id &&
    session.metadata?.beat_id &&
    session.metadata?.license_type
      ? [
          {
            i: session.metadata.beat_license_id,
            b: session.metadata.beat_id,
            t: session.metadata.license_type,
          },
        ]
      : []);

  if (itemsToFulfill.length === 0) {
    logFulfill("error", "missing_metadata", logContext);
    return { fulfilled: false, reason: "missing_metadata" };
  }

  const totalCents = session.amount_total ?? 0;
  const userId = session.metadata?.user_id?.trim() || null;

  const acceptedTermsAtRaw = session.metadata?.accepted_terms_at;
  const acceptedImmediateAtRaw =
    session.metadata?.accepted_immediate_access_at;
  const acceptedAtLegacy = session.metadata?.accepted_at;

  const acceptedTermsAt = acceptedTermsAtRaw
    ? new Date(acceptedTermsAtRaw).toISOString()
    : acceptedAtLegacy
      ? new Date(acceptedAtLegacy).toISOString()
      : null;
  const acceptedLicenseAt = acceptedImmediateAtRaw
    ? new Date(acceptedImmediateAtRaw).toISOString()
    : acceptedTermsAt;
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
      accepted_terms_at: acceptedTermsAt,
      accepted_license_at: acceptedLicenseAt,
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

  for (const item of itemsToFulfill) {
    const result = await fulfillSingleLicenseItem(
      supabase,
      order.id,
      item.i,
      item.b,
      item.t as LicenseType,
      {
        ...logContext,
        beatLicenseId: item.i,
        beatId: item.b,
        licenseType: item.t,
      },
    );

    if (!result.fulfilled) {
      return result;
    }
  }

  logFulfill("info", "fulfilled", {
    ...logContext,
    orderId: order.id,
    itemCount: itemsToFulfill.length,
  });

  return { fulfilled: true, orderId: order.id };
}

export function getCheckoutProductName(
  beatTitle: string,
  licenseType: LicenseType,
): string {
  return `${beatTitle} — ${LICENSE_LABELS[licenseType]}`;
}
