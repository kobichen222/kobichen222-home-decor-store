import type { MetadataRoute } from "next";
import { getAllProductSlugs, getCategories, getCollections } from "@/features/catalog/queries";
import { getBlogPosts } from "@/features/cms/queries";
import { siteUrl } from "@/lib/env";

// Only canonical, indexable URLs — never filter / sort / page variants.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, categories, collections, posts] = await Promise.all([getAllProductSlugs(), getCategories(), getCollections(), getBlogPosts()]);
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/collections`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.5 },
    ...posts.map((p) => ({ url: `${base}/blog/${p.slug}`, lastModified: p.published_at ?? undefined, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...categories.map((c) => ({ url: `${base}/category/${c.slug}`, changeFrequency: "daily" as const, priority: 0.8 })),
    ...collections.map((c) => ({ url: `${base}/collections/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/product/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...["about", "contact", "shipping", "returns", "terms", "privacy", "accessibility", "faq", "business"].map((s) => ({ url: `${base}/${s}`, changeFrequency: "monthly" as const, priority: 0.3 })),
  ];
}
