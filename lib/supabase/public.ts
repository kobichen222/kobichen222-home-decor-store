import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { publicEnv } from "@/lib/env";

// Anonymous, cookie-less client for public catalog and content reads.
// It carries no user session, so its results are safe to cache and share
// between visitors. RLS limits it to active/published rows.
export function createPublicClient() {
  const { supabaseUrl, supabaseKey } = publicEnv();
  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
