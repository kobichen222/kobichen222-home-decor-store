import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type BusinessSettings = {
  name: string;
  tagline: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  hours: string;
  social: { instagram?: string; facebook?: string };
};

export type StoreSettings = {
  business: BusinessSettings;
  announcements: string[];
  seo: { title: string; description: string };
  commerce: { currency: string; vat_rate: number; prices_include_vat: boolean; reservation_minutes: number };
};

const FALLBACK: StoreSettings = {
  business: { name: "בית ועיצוב", tagline: "", phone: "", whatsapp: "", email: "", address: "", hours: "", social: {} },
  announcements: [],
  seo: { title: "בית ועיצוב", description: "" },
  commerce: { currency: "ILS", vat_rate: 18, prices_include_vat: true, reservation_minutes: 30 },
};

export async function getStoreSettings(): Promise<StoreSettings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const { data, error } = await createPublicClient().from("store_settings").select("key, value");
  if (error) throw new Error(`getStoreSettings: ${error.message}`);
  const map = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  return {
    business: { ...FALLBACK.business, ...(map.business as object) },
    announcements: (map.announcements as string[]) ?? [],
    seo: { ...FALLBACK.seo, ...(map.seo as object) },
    commerce: { ...FALLBACK.commerce, ...(map.commerce as object) },
  };
}

export type PageSection = {
  id: string;
  kind: string;
  title: string | null;
  data: Record<string, unknown>;
  hide_on_mobile: boolean;
};

export type ContentPage = {
  id: string;
  slug: string;
  title: string;
  body: string | null;
  seo_title: string | null;
  seo_description: string | null;
  noindex: boolean;
};

export async function getPage(slug: string): Promise<ContentPage | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  const { data, error } = await createPublicClient()
    .from("pages")
    .select("id, slug, title, body, seo_title, seo_description, noindex")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`getPage: ${error.message}`);
  return data;
}

export async function getPageSections(slug: string): Promise<PageSection[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("content");
  const page = await getPage(slug);
  if (!page) return [];
  const { data, error } = await createPublicClient()
    .from("page_sections")
    .select("id, kind, title, data, hide_on_mobile")
    .eq("page_id", page.id)
    .order("sort_order");
  if (error) throw new Error(`getPageSections: ${error.message}`);
  return (data ?? []) as PageSection[];
}

/** Announcement-bar messages, managed in the admin under "באנרים". */
export async function getAnnouncements(): Promise<{ id: string; title: string; link_url: string | null }[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("content");
  const { data, error } = await createPublicClient()
    .from("banners")
    .select("id, title, link_url")
    .eq("placement", "announcement")
    .order("sort_order");
  if (error) throw new Error(`getAnnouncements: ${error.message}`);
  return data ?? [];
}

export type BlogPost = {
  id: string; title: string; slug: string; excerpt: string | null; body: string | null; cover_image_url: string | null;
  tags: string[]; published_at: string | null; seo_title: string | null; seo_description: string | null;
  category: { name: string; slug: string } | null;
};
const POST_COLUMNS = "id, title, slug, excerpt, body, cover_image_url, tags, published_at, seo_title, seo_description, category:blog_categories(name, slug)";

export async function getBlogPosts(): Promise<BlogPost[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("content");
  // RLS returns only published posts whose publish time has passed.
  const { data, error } = await createPublicClient().from("blog_posts").select(POST_COLUMNS).order("published_at", { ascending: false }).limit(200);
  if (error) throw new Error(`getBlogPosts: ${error.message}`);
  return (data ?? []) as unknown as BlogPost[];
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  return (await getBlogPosts()).find((p) => p.slug === slug) ?? null;
}
