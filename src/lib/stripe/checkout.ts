import "server-only";
import { z } from "zod";
import { getAppUrl } from "@/lib/config/env";
import { LICENSE_LABELS } from "@/lib/constants";
import type { LicenseType } from "@/lib/constants";
import { getLicenseAvailability } from "@/lib/beats/licenses";
import { LICENSE_VERSION, TERMS_VERSION } from "@/lib/legal/versions";
import { createClient } from "@/lib/supabase/server";
import { getCheckoutProductName } from "@/lib/stripe/fulfill-order";
import { getStripe } from "@/lib/stripe/server";

const acceptanceFields = {
  acceptedTerms: z.literal(true, {
    message: "Tu dois accepter les CGV et la licence associée.",
  }),
  acceptedImmediateAccess: z.literal(true, {
    message: "Tu dois accepter la livraison immédiate de tes fichiers.",
  }),
  termsVersion: z.string(),
  licenseVersion: z.string(),
};

const singleCheckoutSchema = z.object({
  beatLicenseId: z.string().uuid(),
  email: z.string().email().optional(),
  ...acceptanceFields,
});

const cartCheckoutSchema = z.object({
  items: z
    .array(z.object({ beatLicenseId: z.string().uuid() }))
    .min(1, "Ton panier est vide.")
    .max(20),
  email: z.string().email().optional(),
  ...acceptanceFields,
});

export type CreateCheckoutInput = {
  beatLicenseId?: string;
  items?: { beatLicenseId: string }[];
  email?: string;
  acceptedTerms: true;
  acceptedImmediateAccess: true;
  termsVersion: string;
  licenseVersion: string;
  buyerIp?: string | null;
  buyerUserAgent?: string | null;
};

export type CreateCheckoutResult =
  | { success: true; url: string }
  | { success: false; error: string; status?: number };

type ResolvedLicenseRow = {
  licenseId: string;
  beatId: string;
  beatSlug: string;
  beatTitle: string;
  licenseType: LicenseType;
  priceCents: number;
};

async function resolveCheckoutLicense(
  beatLicenseId: string,
): Promise<{ success: true; row: ResolvedLicenseRow } | { success: false; error: string }> {
  const supabase = await createClient();

  const { data: license, error: licenseError } = await supabase
    .from("beat_licenses")
    .select(
      "id, beat_id, license_type, price_cents, storage_path, is_available, beats!inner(id, slug, title, status)",
    )
    .eq("id", beatLicenseId)
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
    return {
      success: false,
      error: `« ${beat?.title ?? "Ce beat"} » n'est plus disponible.`,
    };
  }

  const licenseType = license.license_type as LicenseType;

  if (licenseType === "exclusive") {
    return {
      success: false,
      error: "Cette licence n'est pas disponible à l'achat.",
    };
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
      exclusiveAlreadySold: false,
    },
  );

  if (!availability.available || availability.licenseId !== license.id) {
    return {
      success: false,
      error: `La licence ${LICENSE_LABELS[licenseType]} pour « ${beat.title} » n'est plus disponible.`,
    };
  }

  return {
    success: true,
    row: {
      licenseId: license.id,
      beatId: beat.id,
      beatSlug: beat.slug,
      beatTitle: beat.title,
      licenseType,
      priceCents: license.price_cents,
    },
  };
}

export async function createLicenseCheckout(
  input: CreateCheckoutInput,
): Promise<CreateCheckoutResult> {
  const isCart = Array.isArray(input.items) && input.items.length > 0;

  const parsed = isCart
    ? cartCheckoutSchema.safeParse(input)
    : singleCheckoutSchema.safeParse({
        beatLicenseId: input.beatLicenseId,
        email: input.email,
        acceptedTerms: input.acceptedTerms,
        acceptedImmediateAccess: input.acceptedImmediateAccess,
        termsVersion: input.termsVersion,
        licenseVersion: input.licenseVersion,
      });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Données invalides.",
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

  if (!user) {
    return {
      success: false,
      error: "Tu dois être connecté pour acheter une licence.",
      status: 401,
    };
  }

  const customerEmail = user.email?.trim().toLowerCase();

  if (!customerEmail) {
    return {
      success: false,
      error: "Ton compte doit avoir une adresse email pour acheter.",
      status: 400,
    };
  }

  const licenseIds = isCart
    ? (parsed.data as z.infer<typeof cartCheckoutSchema>).items.map(
        (item) => item.beatLicenseId,
      )
    : [(parsed.data as z.infer<typeof singleCheckoutSchema>).beatLicenseId];

  const uniqueBeatIds = new Set<string>();
  const resolvedRows: ResolvedLicenseRow[] = [];

  for (const beatLicenseId of licenseIds) {
    const resolved = await resolveCheckoutLicense(beatLicenseId);
    if (!resolved.success) {
      return { success: false, error: resolved.error };
    }

    if (uniqueBeatIds.has(resolved.row.beatId)) {
      return {
        success: false,
        error: `Une seule licence par beat est autorisée (« ${resolved.row.beatTitle} »).`,
      };
    }

    uniqueBeatIds.add(resolved.row.beatId);
    resolvedRows.push(resolved.row);
  }

  const appUrl = getAppUrl();
  const stripe = getStripe();
  const acceptedAt = new Date().toISOString();

  const lineItems = resolvedRows.map((row) => ({
    price_data: {
      currency: "eur",
      unit_amount: row.priceCents,
      product_data: {
        name: getCheckoutProductName(row.beatTitle, row.licenseType),
        description: `Licence ${LICENSE_LABELS[row.licenseType]} — LeSkud Beats`,
      },
    },
    quantity: 1,
  }));

  const cartMetadata =
    resolvedRows.length > 1
      ? JSON.stringify(
          resolvedRows.map((row) => ({
            i: row.licenseId,
            b: row.beatId,
            t: row.licenseType,
          })),
        )
      : "";

  const primary = resolvedRows[0]!;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail,
    line_items: lineItems,
    metadata: {
      checkout_mode: resolvedRows.length > 1 ? "cart" : "single",
      beat_license_id: primary.licenseId,
      beat_id: primary.beatId,
      license_type: primary.licenseType,
      cart_items: cartMetadata,
      user_id: user?.id ?? "",
      customer_email: customerEmail,
      terms_version: parsed.data.termsVersion,
      license_version: parsed.data.licenseVersion,
      accepted_terms_at: acceptedAt,
      accepted_immediate_access_at: acceptedAt,
      buyer_ip: input.buyerIp ?? "",
      buyer_user_agent: input.buyerUserAgent ?? "",
    },
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: resolvedRows.length > 1 ? `${appUrl}/cart` : `${appUrl}/beats/${primary.beatSlug}`,
  });

  if (!session.url) {
    return { success: false, error: "Impossible de créer la session Stripe." };
  }

  return { success: true, url: session.url };
}
