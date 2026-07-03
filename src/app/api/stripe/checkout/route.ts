import { NextResponse } from "next/server";
import { createLicenseCheckout } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? null;
  }
  return request.headers.get("x-real-ip");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    if (body.acceptedTerms !== true) {
      return NextResponse.json(
        { error: "Tu dois accepter les CGV et les conditions de licence." },
        { status: 400 },
      );
    }

    const result = await createLicenseCheckout({
      beatLicenseId: String(body.beatLicenseId ?? ""),
      email: body.email ? String(body.email) : undefined,
      acceptedTerms: true,
      termsVersion: String(body.termsVersion ?? ""),
      licenseVersion: String(body.licenseVersion ?? ""),
      buyerIp: getClientIp(request),
      buyerUserAgent: request.headers.get("user-agent"),
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
