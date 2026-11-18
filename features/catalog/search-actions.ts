"use server";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";

export type Suggestions = {
  products: { name: string; slug: string; price: number; image_url: string | null }[];
  categories: { name: string; slug: string }[];
};

async function cachedSuggest(q: string): Promise<Suggestions> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const db = createPublicClient();
  const { data, error } = await db.rpc("catalog_suggest", { p_q: q });
  if (!error && data) return data as unknown as Suggestions;
  // Fallback while the typo-tolerant search function is not installed in
  // the database: plain "contains" matching on names.
  const like = `%${q.replace(/[%_\\,()]/g, " ").trim()}%`;
  const [{ data: products }, { data: categories }] = await Promise.all([
    db.from("catalog_products").select("name, slug, price, image_url").ilike("name", like).order("sales_count", { ascending: false }).limit(6),
    db.from("categories").select("name, slug").eq("is_active", true).ilike("name", like).limit(4),
  ]);
  return {
    products: (products ?? []).map((p) => ({ ...p, price: Number(p.price) })) as Suggestions["products"],
    categories: (categories ?? []) as Suggestions["categories"],
  };
}

export async function suggest(q: string): Promise<Suggestions> {
  const parsed = z.string().trim().min(2).max(60).safeParse(q);
  if (!parsed.success) return { products: [], categories: [] };
  return cachedSuggest(parsed.data.toLowerCase());
}

export async function popularSearches(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const { data, error } = await createPublicClient().rpc("popular_searches", { p_limit: 6 });
  return error ? [] : ((data as unknown as string[]) ?? []);
}
