import { NextResponse } from "next/server";
import { regenerateBeatPreview } from "@/lib/admin/actions";

type RouteContext = { params: Promise<{ id: string }> };

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const result = await regenerateBeatPreview(id);

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      previewMessage: result.previewMessage ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inattendue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
