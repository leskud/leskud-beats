import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { STORAGE_BUCKETS } from "@/lib/constants";
import { buildPreviewDownloadFilename } from "@/lib/orders/download-filename";
import { verifyFreeDownloadToken } from "@/lib/leads/download-token";

export const runtime = "nodejs";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function attachmentHeaders(filename: string, size: number): HeadersInit {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return {
    "Content-Type": "application/octet-stream",
    "Content-Disposition": `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`,
    "Content-Length": String(size),
    "Cache-Control": "private, no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const beatId = searchParams.get("beatId");
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const expRaw = searchParams.get("exp");
  const exp = expRaw ? Number(expRaw) : NaN;

  if (!beatId || !UUID_RE.test(beatId)) {
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  }

  if (!token || !email || !Number.isFinite(exp)) {
    return NextResponse.json(
      { error: "Lien invalide ou incomplet." },
      { status: 403 },
    );
  }

  const verification = verifyFreeDownloadToken({ beatId, email, exp, token });
  if (!verification.valid) {
    return NextResponse.json({ error: verification.reason }, { status: 403 });
  }

  try {
    const supabase = createServiceClient();

    const { data: beat, error } = await supabase
      .from("beats")
      .select("slug, title, preview_path, status")
      .eq("id", beatId)
      .single();

    if (error || !beat) {
      return NextResponse.json({ error: "Beat introuvable." }, { status: 404 });
    }

    if (beat.status !== "published" || !beat.preview_path) {
      return NextResponse.json(
        { error: "Preview indisponible." },
        { status: 404 },
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKETS.previews)
      .download(beat.preview_path);

    if (downloadError || !file) {
      return NextResponse.json(
        { error: "Fichier introuvable." },
        { status: 404 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = buildPreviewDownloadFilename(beat.title);

    return new NextResponse(buffer, {
      headers: attachmentHeaders(filename, buffer.length),
    });
  } catch {
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
