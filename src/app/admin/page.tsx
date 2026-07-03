import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { BeatList } from "@/components/admin/beat-list";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/require-admin";

export const metadata = {
  title: "Administration",
};

export default async function AdminPage() {
  const { supabase } = await requireAdmin();

  const { data: beats } = await supabase
    .from("beats")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Administration</h1>
          <p className="mt-2 text-muted">
            Gérez vos beats, fichiers et statuts de publication.
          </p>
        </div>
        <Link href="/admin/beats/new">
          <Button className="inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouveau beat
          </Button>
        </Link>
      </div>

      <AdminNav />

      <div className="mt-10">
        <BeatList beats={beats ?? []} />
      </div>
    </div>
  );
}
