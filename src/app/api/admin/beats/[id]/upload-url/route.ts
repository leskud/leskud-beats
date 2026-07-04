import { NextResponse } from "next/server";
import {
  BEAT_FILE_KINDS,
  getBeatFileBucket,
  getBeatFileContentType,
  getBeatFilePath,
  isPaidBeatFileKind,
  resolveCoverPath,
  type BeatFileKind,
} from "@/lib/admin/beat-paths";
import {
  adminErrorResponse,
  requireAdminApi,
} from "@/lib/admin/require-admin-api";
import { isR2Configured } from "@/lib/config/env";
import { createR2PresignedPutUrl } from "@/lib/storage/r2-presign";
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
    .select("id")
    .eq("id", beatId)
    .maybeSingle();

  if (!beat) {
    return NextResponse.json({ error: "Beat introuvable." }, { status: 404 });
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

  if (isPaidBeatFileKind(kind)) {
    if (!isR2Configured()) {
      return NextResponse.json(
        { error: "Stockage R2 non configuré sur le serveur." },
        { status: 500 },
      );
    }

    const path = getBeatFilePath(beatId, kind);
    const contentType = getBeatFileContentType(kind);
    const { uploadUrl } = await createR2PresignedPutUrl(path, contentType);

    return NextResponse.json({
      provider: "r2",
      path,
      uploadUrl,
      contentType,
    });
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
    provider: "supabase",
    bucket,
    path: data.path,
    token: data.token,
  });
}
