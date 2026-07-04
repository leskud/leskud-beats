import "server-only";
import { z } from "zod";
import { getAppUrl } from "@/lib/config/env";
import { LICENSE_LABELS } from "@/lib/constants";
import { getLicenseAvailability } from "@/lib/beats/licenses";
import {
  EXCLUSIVE_SOLD_MESSAGE,
  getExclusivePurchaseBlockState,
} from "@/lib/beats/exclusive-guard";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutProductName } from "@/lib/stripe/fulfill-order";
import { getStripe } from "@/lib/stripe/server";
import type { LicenseType } from "@/lib/constants";

const checkoutInputSchema = z.object({
  beatLicenseId: z.string().uuid(),
  email: z.string().email().optional(),
  acceptedTerms: z.literal(true, {
    message: "Tu dois accepter les CGV et les conditions de licence.",
  }),
  termsVersion: z.string(),
  licenseVersion: z.string(),
});

export type CreateCheckoutInput = z.infer<typeof checkoutInputSchema> & {
  buyerIp?: string | null;
  buyerUserAgent?: string | null;
};

export type CreateCheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function createLicenseCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Données invalides.",
    };
  }

  if (parsed.data.termsVersion !== TERMS_VERSION) {
    return {
      success: false,
      error: "Les CGV ont été mises à jour. Recharge la page.",
    };
  }

  if (parsed.data.licenseVersion !== LICENSE_VERSION) {
    return {
      success: false,
      error: "Les licences ont été mises à jour. Recharge la page.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const customerEmail =
    parsed.data.email?.trim().toLowerCase() ?? user?.email?.toLowerCase();

  if (!customerEmail) {
    return {
      success: false,
      error: "Indique ton email pour recevoir la licence.",
    };
  }

  const { data: license, error: licenseError } = await supabase
    .from("beat_licenses")
    .select(
      "id, beat_id, license_type, price_cents, storage_path, is_available, beats!inner(id, slug, title, status)",
    )
    .eq("id", parsed.data.beatLicenseId)
    .single();

  if (licenseError || !license) {
    return { success: false, error: "Licence introuvable." };
  }

  const beatRaw = license.beats as unknown;
  const beat = (Array.isArray(beatRaw) ? beatRaw[0] : beatRaw) as {
    id: string;
    slug: string;
    title: string;
    status: string;
  };

  if (!beat?.id || beat.status !== "published") {
    return { success: false, error: "Ce beat n'est plus disponible." };
  }

  const licenseType = license.license_type as LicenseType;

  const exclusiveBlockState =
    licenseType === "exclusive"
      ? await getExclusivePurchaseBlockState(beat.id, beat.status)
      : { blocked: false, exclusiveAlreadySold: false };

  if (licenseType === "exclusive" && exclusiveBlockState.blocked) {
    return { success: false, error: EXCLUSIVE_SOLD_MESSAGE };
  }

  const { data: beatLicenses } = await supabase
    .from("beat_licenses")
    .select("*")
    .eq("beat_id", beat.id);

  const availability = getLicenseAvailability(
    beatLicenses ?? [],
    licenseType,
    {
      beatStatus: beat.status as "draft" | "published" | "sold_exclusive",
      exclusiveAlreadySold: exclusiveBlockState.exclusiveAlreadySold,
    },
  );

  if (!availability.available || availability.licenseId !== license.id) {
    if (licenseType === "exclusive" && exclusiveBlockState.blocked) {
      return { success: false, error: EXCLUSIVE_SOLD_MESSAGE };
    }
    return { success: false, error: "Cette licence n'est plus disponible." };
  }

  const appUrl = getAppUrl();
  const stripe = getStripe();
  const acceptedAt = new Date().toISOString();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: license.price_cents,
          product_data: {
            name: getCheckoutProductName(beat.title, licenseType),
            description: `Licence ${LICENSE_LABELS[licenseType]} — LeSkud Beats`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      beat_license_id: license.id,
      beat_id: beat.id,
      license_type: licenseType,
      user_id: user?.id ?? "",
      customer_email: customerEmail,
      terms_version: parsed.data.termsVersion,
      license_version: parsed.data.licenseVersion,
      accepted_at: acceptedAt,
      buyer_ip: input.buyerIp ?? "",
      buyer_user_agent: input.buyerUserAgent ?? "",
    },
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/beats/${beat.slug}`,
  });

  if (!session.url) {
    return { success: false, error: "Impossible de créer la session Stripe." };
  }

  return { success: true, url: session.url };
}
