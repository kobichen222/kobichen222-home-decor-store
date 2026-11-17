import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv, serverEnv } from "@/lib/env";

// Service-role client: bypasses RLS. Used only on the server for carts,
// checkout and payment processing. Never import this from client code —
// the `server-only` import makes such a build fail.
export function createServiceClient() {
  return createClient<Database>(publicEnv().supabaseUrl, serverEnv.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
