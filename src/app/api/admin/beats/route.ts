import { NextResponse } from "next/server";
import { createBeatShell } from "@/lib/admin/actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createBeatShell(formData);

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, beatId: result.beatId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inattendue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
