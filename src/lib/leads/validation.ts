import { z } from "zod";

export const freeDownloadSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "L'email est requis.")
    .email("Adresse email invalide.")
    .max(320),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
  beatId: z.string().uuid("Beat invalide."),
  utmSource: z.string().trim().max(120).optional().or(z.literal("")),
  utmMedium: z.string().trim().max(120).optional().or(z.literal("")),
  utmCampaign: z.string().trim().max(120).optional().or(z.literal("")),
  referrer: z.string().trim().max(500).optional().or(z.literal("")),
});

export type FreeDownloadInput = z.infer<typeof freeDownloadSchema>;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
