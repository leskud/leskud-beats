import type { LeadWithStats } from "@/lib/leads/queries";

type LeadListProps = {
  leads: LeadWithStats[];
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function LeadList({ leads }: LeadListProps) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-muted">
        Aucun lead pour le moment. Les téléchargements gratuits apparaîtront
        ici.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60 text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Marketing</th>
              <th className="px-4 py-3 font-medium">Téléchargements</th>
              <th className="px-4 py-3 font-medium">Dernier DL</th>
              <th className="px-4 py-3 font-medium">Inscrit le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-background/40">
                <td className="px-4 py-3 font-medium">{lead.email}</td>
                <td className="px-4 py-3 text-muted">{lead.name ?? "—"}</td>
                <td className="px-4 py-3">
                  {lead.marketing_consent ? (
                    <span className="rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                      Oui
                    </span>
                  ) : (
                    <span className="text-muted">Non</span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{lead.download_count}</td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(lead.last_download_at)}
                </td>
                <td className="px-4 py-3 text-muted">
                  {formatDate(lead.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
