import { cacheLife, cacheTag } from "next/cache";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";

async function findRedirect(path: string): Promise<{ to_path: string; status_code: number } | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog", "content");
  const { data } = await createPublicClient().from("redirects").select("to_path, status_code").eq("from_path", path).maybeSingle();
  return data;
}

/** Follows a managed 301/302 for an old URL, otherwise shows the 404 page. */
export async function redirectOrNotFound(path: string): Promise<never> {
  const hit = await findRedirect(path);
  if (hit && hit.to_path.startsWith("/") && !hit.to_path.startsWith("//") && hit.to_path !== path) {
    if (hit.status_code === 301 || hit.status_code === 308) permanentRedirect(hit.to_path);
    redirect(hit.to_path);
  }
  notFound();
}
