import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/config/app-url";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/account";

  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/account";

  const appUrl = getAppUrl();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appUrl}${safeNext}`);
    }
  }

  return NextResponse.redirect(`${appUrl}/login?error=auth`);
}
