import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AdminApiSuccess = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
};

type AdminApiFailure = {
  error: string;
  status: number;
};

export async function requireAdminApi(): Promise<
  AdminApiSuccess | AdminApiFailure
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Connexion requise.", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return { error: "Accès admin refusé.", status: 403 };
  }

  return { supabase, user };
}

export function adminErrorResponse(result: AdminApiFailure) {
  return NextResponse.json({ error: result.error }, { status: result.status });
}
