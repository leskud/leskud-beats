import { AdminNav } from "@/components/admin/admin-nav";
import { LeadList } from "@/components/admin/lead-list";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getLeadsWithStats } from "@/lib/leads/queries";

export const metadata = {
  title: "Leads",
};

export default async function AdminLeadsPage() {
  const { supabase } = await requireAdmin();
  const leads = await getLeadsWithStats(supabase);

  const totalDownloads = leads.reduce((sum, l) => sum + l.download_count, 0);
  const marketingOptIns = leads.filter((l) => l.marketing_consent).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-3xl font-semibold">Leads</h1>
        <p className="mt-2 text-muted">
          Emails collectés via les téléchargements MP3 tagués gratuits.
        </p>
      </div>

      <AdminNav />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Leads uniques</p>
          <p className="mt-1 text-2xl font-semibold">{leads.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Téléchargements</p>
          <p className="mt-1 text-2xl font-semibold">{totalDownloads}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">Consentement marketing</p>
          <p className="mt-1 text-2xl font-semibold">{marketingOptIns}</p>
        </div>
      </div>

      <LeadList leads={leads} />
    </div>
  );
}
