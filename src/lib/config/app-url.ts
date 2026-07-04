const DEV_APP_URL = "http://localhost:3000";
const DEFAULT_CANONICAL_HOST = "leskud-beats.vercel.app";

function normalizeAppUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostHost(host: string): boolean {
  return (
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".localhost")
  );
}

function getCanonicalHostFromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (raw) {
    return new URL(raw).host;
  }
  return DEFAULT_CANONICAL_HOST;
}

/** Vercel preview deployments use slugs like leskud-beats-<hash>-team.vercel.app */
export function isVercelPreviewHost(host: string): boolean {
  if (!host.endsWith(".vercel.app")) return false;
  if (isLocalhostHost(host)) return false;
  return host !== getCanonicalHostFromEnv();
}

function assertValidProductionAppUrl(url: string): void {
  const host = new URL(url).host;

  if (isLocalhostHost(host)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL ne doit pas pointer vers localhost en production.",
    );
  }

  if (isVercelPreviewHost(host)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL ne doit pas être une URL preview Vercel. Utilise https://leskud-beats.vercel.app",
    );
  }
}

/**
 * URL publique canonique du site.
 * Production : NEXT_PUBLIC_APP_URL uniquement (pas de fallback VERCEL_URL).
 * Dev : NEXT_PUBLIC_APP_URL ou http://localhost:3000
 */
export function getAppUrl(): string {
  const isProduction = process.env.NODE_ENV === "production";
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (isProduction) {
    if (!raw) {
      throw new Error("NEXT_PUBLIC_APP_URL est obligatoire en production.");
    }
    const normalized = normalizeAppUrl(raw);
    assertValidProductionAppUrl(normalized);
    return normalized;
  }

  return normalizeAppUrl(raw ?? DEV_APP_URL);
}

export function getCanonicalRedirectUrl(
  host: string,
  pathname: string,
  search: string,
): string | null {
  if (isLocalhostHost(host)) return null;
  if (!isVercelPreviewHost(host)) return null;

  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const base = raw ? normalizeAppUrl(raw) : `https://${DEFAULT_CANONICAL_HOST}`;
  return `${base}${pathname}${search}`;
}

export { DEV_APP_URL };
