export const STORAGE_PROVIDERS = ["supabase", "r2"] as const;
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number];

export type PaidFileRef = {
  storagePath: string;
  storageProvider: StorageProvider;
};

export function normalizeStorageProvider(
  value: string | null | undefined,
): StorageProvider {
  return value === "r2" ? "r2" : "supabase";
}
