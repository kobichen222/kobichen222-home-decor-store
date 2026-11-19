import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Managed redirects (admin "הפניות 301" plus automatic ones created when a
// product, category, page or post changes its address). Read with the public
// key and kept in memory for a minute, so a storefront request costs a map
// lookup, not a database call. On any failure the last good copy is kept.
type Target = { to: string; code: number };
let redirectCache: { at: number; map: Map<string, Target> } | null = null;

async function redirectMap(): Promise<Map<string, Target>> {
  if (redirectCache && Date.now() - redirectCache.at < 60_000) return redirectCache.map;
  try {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/redirects?select=from_path,to_path,status_code&limit=5000`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) throw new Error(String(res.status));
    const rows = (await res.json()) as { from_path: string; to_path: string; status_code: number }[];
    redirectCache = { at: Date.now(), map: new Map(rows.map((r) => [r.from_path, { to: r.to_path, code: r.status_code }])) };
  } catch {
    redirectCache = { at: Date.now(), map: redirectCache?.map ?? new Map() };
  }
  return redirectCache.map;
}

async function storefront(request: NextRequest) {
  const path = decodeURIComponent(request.nextUrl.pathname).replace(/\/+$/, "") || "/";
  const target = (await redirectMap()).get(path);
  // Only same-site targets, and never a loop back to the same address.
  if (!target || !target.to.startsWith("/") || target.to.startsWith("//") || target.to === path) return NextResponse.next();
  const url = new URL(target.to, request.url);
  if (!url.search) url.search = request.nextUrl.search;
  return NextResponse.redirect(url, target.code);
}

// /admin and /account: refreshes the Supabase session cookie and sends
// signed-out visitors to the login page. This is an optimistic check for
// UX — real authorization happens in requireAdmin() and in database RLS.
export async function proxy(request: NextRequest) {
  const first = request.nextUrl.pathname.split("/")[1];
  if (first !== "admin" && first !== "account") return storefront(request);

  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });
  // Verifies the token locally and refreshes it when it is about to expire.
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  const path = request.nextUrl.pathname;
  if (path.startsWith("/account")) {
    const open = path === "/account/login" || path === "/account/register";
    if (!signedIn && !open) {
      const url = request.nextUrl.clone();
      url.pathname = "/account/login";
      url.search = `?next=${encodeURIComponent(path)}`;
      return NextResponse.redirect(url);
    }
    return response;
  }
  const isLogin = path === "/admin/login";
  if (!signedIn && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/account/:path*",
    // Storefront pages; not Next.js internals, API routes or files with an extension.
    "/((?!_next/|api/|admin|account|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
