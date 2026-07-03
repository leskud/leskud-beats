import { NextResponse } from "next/server";
import { createPaidDownload } from "@/lib/orders/download";
import { parseDownloadFileType } from "@/lib/orders/download-entitlements";

export const runtime = "nodejs";

function attachmentHeaders(filename: string, size: number, contentType: string): HeadersInit {
  const safe = filename.replace(/[^\w.-]+/g, "_");
  const encoded = encodeURIComponent(filename);
  return {
    "Content-Type": contentType,
    "Content-Disposition": `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`,
    "Content-Length": String(size),
    "Cache-Control": "private, no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orderItemId = searchParams.get("orderItemId");
  const fileType = parseDownloadFileType(searchParams.get("fileType"));
  const sessionId = searchParams.get("sessionId");

  if (!orderItemId) {
    return NextResponse.json({ error: "Paramètre manquant." }, { status: 400 });
  }

  if (!fileType) {
    return NextResponse.json(
      { error: "Type de fichier manquant ou invalide." },
      { status: 400 },
    );
  }

  const result = await createPaidDownload({
    orderItemId,
    fileType,
    sessionId,
  });

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  const body = new Uint8Array(result.buffer);

  return new NextResponse(body, {
    headers: attachmentHeaders(
      result.filename,
      body.byteLength,
      result.contentType,
    ),
  });
}
