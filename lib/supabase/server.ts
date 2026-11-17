import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

// Session client: acts as the signed-in user (cookies), so every query is
// subject to RLS. This is what the admin panel uses — permissions are
// enforced by the database, not only by the UI.
export async function createSessionClient() {
  // Session-bound work is strictly per request: keep it out of prerenders
  // and of link prefetches (the auth client also reads the clock).
  await connection();
  const cookieStore = await cookies();
  const { supabaseUrl, supabaseKey } = publicEnv();
  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: cookies are read-only there.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}
