import { createHmac, timingSafeEqual } from "node:crypto";
import "server-only";
import {
  getAppUrl,
  getDownloadTokenSecret,
  getFreeDownloadTokenTtlSeconds,
} from "@/lib/config/env";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type FreeDownloadTokenParams = {
  beatId: string;
  email: string;
  exp: number;
  token: string;
};

function signPayload(beatId: string, email: string, exp: number): string {
  const payload = `${beatId}:${email.toLowerCase()}:${exp}`;
  return createHmac("sha256", getDownloadTokenSecret())
    .update(payload)
    .digest("base64url");
}

export function createFreeDownloadToken(
  beatId: string,
  email: string,
): { token: string; exp: number } {
  const exp =
    Math.floor(Date.now() / 1000) + getFreeDownloadTokenTtlSeconds();
  const token = signPayload(beatId, email, exp);
  return { token, exp };
}

export function buildFreeDownloadUrl(
  beatId: string,
  email: string,
): string {
  const { token, exp } = createFreeDownloadToken(beatId, email);
  const params = new URLSearchParams({
    token,
    exp: String(exp),
    email,
  });
  return `${getAppUrl()}/download/beat/${beatId}?${params.toString()}`;
}

export function verifyFreeDownloadToken(
  params: FreeDownloadTokenParams,
): { valid: true } | { valid: false; reason: string } {
  const { beatId, email, exp, token } = params;

  if (!UUID_RE.test(beatId)) {
    return { valid: false, reason: "Lien invalide." };
  }

  if (!email || !email.includes("@")) {
    return { valid: false, reason: "Lien invalide." };
  }

  if (!token || !Number.isFinite(exp)) {
    return { valid: false, reason: "Lien invalide." };
  }

  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    return { valid: false, reason: "Ce lien a expiré. Redemande un email." };
  }

  const expected = signPayload(beatId, email, exp);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  if (
    expectedBuffer.length !== tokenBuffer.length ||
    !timingSafeEqual(expectedBuffer, tokenBuffer)
  ) {
    return { valid: false, reason: "Lien invalide ou modifié." };
  }

  return { valid: true };
}
