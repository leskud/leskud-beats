import type { Lead } from "@/types/database";

export type LeadWithStats = Lead & {
  download_count: number;
  last_download_at: string | null;
};

export async function getLeadsWithStats(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/admin/require-admin").requireAdmin>
  >["supabase"],
): Promise<LeadWithStats[]> {
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      lead_downloads ( downloaded_at )
    `,
    )
    .order("last_seen_at", { ascending: false });

  if (error || !leads) return [];

  return leads.map((lead) => {
    const downloads = (lead.lead_downloads ?? []) as { downloaded_at: string }[];
    const sorted = downloads
      .map((d) => d.downloaded_at)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      id: lead.id,
      email: lead.email,
      name: lead.name,
      marketing_consent: lead.marketing_consent,
      accepted_newsletter_at: lead.accepted_newsletter_at ?? null,
      consent_text: lead.consent_text ?? null,
      source: lead.source,
      created_at: lead.created_at,
      last_seen_at: lead.last_seen_at,
      download_count: downloads.length,
      last_download_at: sorted[0] ?? null,
    };
  });
}
