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
  const { data } = await createPublicClient().rpc("catalog_suggest", { p_q: q });
  return (data as unknown as Suggestions) ?? { products: [], categories: [] };
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
  const { data } = await createPublicClient().rpc("popular_searches", { p_limit: 6 });
  return (data as unknown as string[]) ?? [];
}
