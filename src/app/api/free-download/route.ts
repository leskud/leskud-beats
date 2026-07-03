import { NextResponse } from "next/server";
import { processFreeDownload } from "@/lib/leads/process-free-download";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const userAgent = request.headers.get("user-agent");

    const result = await processFreeDownload({
      email: String(body.email ?? ""),
      name: body.name ? String(body.name) : undefined,
      marketingConsent: Boolean(body.marketingConsent),
      beatId: String(body.beatId ?? ""),
      utmSource: body.utmSource ? String(body.utmSource) : undefined,
      utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
      utmCampaign: body.utmCampaign ? String(body.utmCampaign) : undefined,
      referrer: body.referrer ? String(body.referrer) : undefined,
      userAgent,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      beatTitle: result.beatTitle,
      emailSent: result.emailSent,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inattendue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
