import { NextResponse } from "next/server";
import { createPaidDownload } from "@/lib/orders/download";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderItemId = searchParams.get("orderItemId");
  const sessionId = searchParams.get("sessionId");

  if (!orderItemId) {
    return NextResponse.json({ error: "Paramètre manquant." }, { status: 400 });
  }

  const result = await createPaidDownload({
    orderItemId,
    sessionId,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.redirect(result.signedUrl);
}
