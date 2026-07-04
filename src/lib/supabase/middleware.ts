import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getAppUrl, getCanonicalRedirectUrl } from "@/lib/config/app-url";

const PUBLIC_PATHS = ["/", "/beats", "/cart", "/legal", "/download", "/checkout"];
const AUTH_PATHS = ["/login", "/register"];

function isPublicPath(pathname: string): boolean {
  if (AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/auth/")) {
    return true;
  }
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  return false;
}

function absolutePath(pathname: string, search = ""): URL {
  return new URL(`${pathname}${search}`, getAppUrl());
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value, ...options }) => {
    to.cookies.set(name, value, options);
  });
}

export async function updateSession(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const canonicalRedirect = getCanonicalRedirectUrl(
    host,
    request.nextUrl.pathname,
    request.nextUrl.search,
  );

  if (canonicalRedirect) {
    return NextResponse.redirect(canonicalRedirect, 308);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (user && AUTH_PATHS.includes(pathname)) {
    const redirectResponse = NextResponse.redirect(absolutePath("/account"));
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith("/account/licenses/")) {
    return supabaseResponse;
  }

  if (pathname.startsWith("/account") && !user) {
    const loginUrl = absolutePath("/login");
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  if (pathname.startsWith("/admin")) {
    if (!user) {
      const loginUrl = absolutePath("/login");
      loginUrl.searchParams.set("next", pathname);
      const redirectResponse = NextResponse.redirect(loginUrl);
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      const redirectResponse = NextResponse.redirect(absolutePath("/"));
      copyCookies(supabaseResponse, redirectResponse);
      return redirectResponse;
    }
  }

  if (!isPublicPath(pathname) && !user) {
    const loginUrl = absolutePath("/login");
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, redirectResponse);
    return redirectResponse;
  }

  return supabaseResponse;
}
