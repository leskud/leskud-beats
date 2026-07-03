const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
const STORAGE_PREFIX = "leskud_";

export type UtmParams = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
};

export function captureUtmFromUrl(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, value);
    }
  }
}

export function getStoredUtmParams(): UtmParams {
  if (typeof window === "undefined") return {};

  return {
    utmSource:
      sessionStorage.getItem(`${STORAGE_PREFIX}utm_source`) ?? undefined,
    utmMedium:
      sessionStorage.getItem(`${STORAGE_PREFIX}utm_medium`) ?? undefined,
    utmCampaign:
      sessionStorage.getItem(`${STORAGE_PREFIX}utm_campaign`) ?? undefined,
  };
}

export function getStoredReferrer(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.referrer || undefined;
}

const LEAD_EMAIL_KEY = "leskud_lead_email";
const LEAD_NAME_KEY = "leskud_lead_name";

export function getStoredLeadIdentity(): { email?: string; name?: string } {
  if (typeof sessionStorage === "undefined") return {};
  return {
    email: sessionStorage.getItem(LEAD_EMAIL_KEY) ?? undefined,
    name: sessionStorage.getItem(LEAD_NAME_KEY) ?? undefined,
  };
}

export function storeLeadIdentity(email: string, name?: string): void {
  sessionStorage.setItem(LEAD_EMAIL_KEY, email);
  if (name?.trim()) {
    sessionStorage.setItem(LEAD_NAME_KEY, name.trim());
  }
}

export async function triggerFileDownload(
  url: string,
  filename: string,
): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Téléchargement impossible.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}
