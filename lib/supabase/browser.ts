"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// Browser client for the admin panel (direct-to-storage image uploads).
// Uses the publishable key and the admin's own session; storage policies
// decide what it may write.
export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
