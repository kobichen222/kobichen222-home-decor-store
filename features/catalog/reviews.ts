import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type Review = { id: string; author_name: string; rating: number; title: string | null; body: string | null; is_verified: boolean; created_at: string };
export type Faq = { id: string; question: string; answer: string };

export async function getProductReviews(productId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const db = createPublicClient();
  const [{ data: reviews }, { data: rating }, { data: faqs }] = await Promise.all([
    db.from("reviews").select("id, author_name, rating, title, body, is_verified, created_at").eq("product_id", productId).order("created_at", { ascending: false }).limit(50),
    db.from("product_ratings").select("average, count").eq("product_id", productId).maybeSingle(),
    db.from("faqs").select("id, question, answer").eq("product_id", productId).order("sort_order"),
  ]);
  return {
    reviews: (reviews ?? []) as Review[],
    average: rating?.average ? Number(rating.average) : null,
    count: rating?.count ?? 0,
    faqs: (faqs ?? []) as Faq[],
  };
}

export async function getGeneralFaqs(): Promise<Faq[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  const { data } = await createPublicClient().from("faqs").select("id, question, answer").is("product_id", null).order("sort_order");
  return (data ?? []) as Faq[];
}
