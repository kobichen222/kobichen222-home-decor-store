import "server-only";
import { headers } from "next/headers";
import { createServiceClient } from "@/lib/supabase/service";

/** Client IP as seen by Vercel's edge (first hop of x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Fixed-window limiter backed by the database, shared by all server
 * instances. Fails open if the database call itself fails, so a limiter
 * problem never locks every shopper out.
 */
export async function allow(bucket: string, id: string, limit: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
    p_key: `${bucket}:${id}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return true;
  }
  return data === true;
}
