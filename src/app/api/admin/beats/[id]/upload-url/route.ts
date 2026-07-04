import { NextResponse } from "next/server";
import {
  BEAT_FILE_KINDS,
  getBeatFileBucket,
  getBeatFilePath,
  resolveCoverPath,
  type BeatFileKind,
} from "@/lib/admin/beat-paths";
import {
  adminErrorResponse,
  requireAdminApi,
} from "@/lib/admin/require-admin-api";
import { createServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const auth = await requireAdminApi();
  if ("error" in auth) {
    return adminErrorResponse(auth);
  }

  const { id: beatId } = await context.params;

  const { data: beat } = await auth.supabase
    .from("beats")
    .select("id, status")
    .eq("id", beatId)
    .maybeSingle();

  if (!beat) {
    return NextResponse.json({ error: "Beat introuvable." }, { status: 404 });
  }

  if (beat.status === "sold_exclusive") {
    return NextResponse.json(
      { error: "Beat exclusive vendu — upload impossible." },
      { status: 403 },
    );
  }

  let body: { kind?: string; filename?: string };
  try {
    body = (await request.json()) as { kind?: string; filename?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide." }, { status: 400 });
  }

  const kind = body.kind as BeatFileKind | undefined;
  if (!kind || !BEAT_FILE_KINDS.includes(kind)) {
    return NextResponse.json(
      { error: "Type de fichier invalide." },
      { status: 400 },
    );
  }

  const bucket = getBeatFileBucket(kind);
  const path =
    kind === "cover"
      ? resolveCoverPath(beatId, body.filename ?? "cover.jpg")
      : getBeatFilePath(beatId, kind);

  const service = createServiceClient();
  const { data, error } = await service.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Impossible de créer l'URL d'upload." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    bucket,
    path: data.path,
    token: data.token,
  });
}
