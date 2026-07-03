import { NextResponse } from "next/server";
import { createBeat } from "@/lib/admin/actions";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await createBeat(formData);

    if (result?.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error && error.message.includes("Unexpected end of form")
        ? "Fichiers trop volumineux ou envoi interrompu. Réduisez la taille (max 250 Mo total) et réessayez."
        : error instanceof Error
          ? error.message
          : "Erreur serveur inattendue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
