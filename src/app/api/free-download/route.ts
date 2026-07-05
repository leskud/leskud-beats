import { NextResponse } from "next/server";
import { processFreeDownload } from "@/lib/leads/process-free-download";

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
    const userAgent = request.headers.get("user-agent");
    const clientIp = getClientIp(request);

    const result = await processFreeDownload({
      email: String(body.email ?? ""),
      name: body.name ? String(body.name) : undefined,
      marketingConsent: body.marketingConsent === true,
      beatId: String(body.beatId ?? ""),
      utmSource: body.utmSource ? String(body.utmSource) : undefined,
      utmMedium: body.utmMedium ? String(body.utmMedium) : undefined,
      utmCampaign: body.utmCampaign ? String(body.utmCampaign) : undefined,
      referrer: body.referrer ? String(body.referrer) : undefined,
      userAgent,
      clientIp,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      beatTitle: result.beatTitle,
      emailSent: result.emailSent,
      emailWarning: result.emailWarning,
      downloadPath: result.downloadPath,
      previewFilename: result.previewFilename,
    });
  } catch (error) {
    console.error(
      "[free-download] unexpected error:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Une erreur est survenue. Réessayez." },
      { status: 500 },
    );
  }
}
