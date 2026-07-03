import { NextResponse } from "next/server";
import { createLicenseCheckout } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const result = await createLicenseCheckout({
      beatLicenseId: String(body.beatLicenseId ?? ""),
      email: body.email ? String(body.email) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ url: result.url });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("STRIPE")
        ? "Paiement indisponible — clés Stripe manquantes."
        : error instanceof Error
          ? error.message
          : "Erreur serveur inattendue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
