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
        { error: "Tu dois accepter les CGV et la licence associée." },
        { status: 400 },
      );
    }

    if (body.acceptedImmediateAccess !== true) {
      return NextResponse.json(
        {
          error: "Tu dois accepter la livraison immédiate de tes fichiers.",
        },
        { status: 400 },
      );
    }

    const items = Array.isArray(body.items)
      ? body.items
          .filter(
            (entry): entry is { beatLicenseId: string } =>
              Boolean(
                entry &&
                  typeof entry === "object" &&
                  typeof (entry as { beatLicenseId?: string }).beatLicenseId ===
                    "string",
              ),
          )
          .map((entry) => ({ beatLicenseId: entry.beatLicenseId }))
      : undefined;

    const result = await createLicenseCheckout({
      beatLicenseId: body.beatLicenseId
        ? String(body.beatLicenseId)
        : undefined,
      items,
      email: body.email ? String(body.email) : undefined,
      acceptedTerms: true,
      acceptedImmediateAccess: true,
      termsVersion: String(body.termsVersion ?? ""),
      licenseVersion: String(body.licenseVersion ?? ""),
      buyerIp: getClientIp(request),
      buyerUserAgent: request.headers.get("user-agent"),
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status ?? 400 },
      );
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
