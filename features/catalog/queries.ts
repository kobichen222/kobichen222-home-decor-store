import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import {
  PAGE_SIZE,
  type Category,
  type Collection,
  type Facets,
  type ListingFilters,
  type ProductCard,
  type ProductDetail,
  type ProductVariant,
} from "./types";

// Public catalog reads. Everything here is cached and tagged "catalog";
// admin mutations and paid orders expire the tag, and the short lifetime
// bounds how stale a price or stock badge can ever be. Checkout never
// trusts these values — it re-reads prices and stock inside the database.

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

const CATEGORY_COLUMNS =
  "id, parent_id, name, slug, description, image_url, banner_url, sort_order, show_on_home, seo_title, seo_description";

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await createPublicClient()
    .from("categories")
    .select(CATEGORY_COLUMNS)
    .order("sort_order")
    .order("name");
  fail("getCategories", error);
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const all = await getCategories();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getCollections(): Promise<Collection[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await createPublicClient()
    .from("collections")
    .select("id, name, slug, description, image_url, seo_title, seo_description")
    .order("sort_order");
  fail("getCollections", error);
  return data ?? [];
}

export async function searchProducts(filters: ListingFilters): Promise<{ items: ProductCard[]; total: number }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const page = Math.max(1, filters.page ?? 1);
  const { data, error } = await createPublicClient().rpc("catalog_search", {
    p_category_id: filters.categoryId ?? undefined,
    p_collection_id: filters.collectionId ?? undefined,
    p_q: filters.q ?? undefined,
    p_value_ids: filters.valueIds?.length ? filters.valueIds : undefined,
    p_min_price: filters.minPrice ?? undefined,
    p_max_price: filters.maxPrice ?? undefined,
    p_on_sale: filters.onSale ?? false,
    p_in_stock: filters.inStock ?? false,
    p_sort: filters.sort ?? "featured",
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  fail("searchProducts", error);
  const result = data as unknown as { items: ProductCard[]; total: number };
  return { items: result.items ?? [], total: result.total ?? 0 };
}

export async function getFacets(scope: Pick<ListingFilters, "categoryId" | "collectionId" | "q">): Promise<Facets> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const { data, error } = await createPublicClient().rpc("catalog_facets", {
    p_category_id: scope.categoryId ?? undefined,
    p_collection_id: scope.collectionId ?? undefined,
    p_q: scope.q ?? undefined,
  });
  fail("getFacets", error);
  return data as unknown as Facets;
}

export async function getProductGrid(source: "bestsellers" | "newest" | "sale" | "featured", limit: number) {
  const { items } = await searchProducts({
    sort: source === "sale" ? "discount" : source,
    onSale: source === "sale",
    page: 1,
  });
  return items.slice(0, limit);
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const supabase = createPublicClient();
  const { data: product, error } = await supabase
    .from("products")
    .select(
      `id, name, slug, sku, short_description, description, specs, width_cm, height_cm, depth_cm, weight_kg,
       installation_instructions, care_instructions, delivery_days_min, delivery_days_max, video_url,
       seo_title, seo_description, og_image_url, noindex,
       brand:brands(name, slug),
       images:product_images(id, url, alt, is_primary, sort_order),
       videos:product_videos(id, kind, url, title, sort_order, created_at),
       categories:product_categories(is_primary, category:categories(name, slug)),
       attributes:product_attribute_assignments(value:product_attribute_values(value, color_hex))`,
    )
    .eq("slug", slug)
    .maybeSingle();
  fail("getProductBySlug", error);
  if (!product) return null;

  const { data: variants, error: variantsError } = await supabase
    .from("catalog_variants")
    .select(
      "id, sku, name, options, is_default, image_id, lead_time_days, regular_price, price, available, in_stock, allow_backorder, low_stock, sort_order",
    )
    .eq("product_id", product.id)
    .order("sort_order");
  fail("getProductBySlug.variants", variantsError);
  if (!variants?.length) return null;

  const colorHex: Record<string, string> = {};
  for (const a of product.attributes ?? []) {
    if (a.value?.color_hex) colorHex[a.value.value] = a.value.color_hex;
  }

  return {
    ...product,
    specs: (product.specs as ProductDetail["specs"]) ?? [],
    images: [...(product.images ?? [])].sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
    ),
    videos: [...(product.videos ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ id, kind, url, title, created_at }) => ({ id, kind: kind as "file" | "youtube", url, title, created_at })),
    variants: variants as unknown as ProductVariant[],
    categories: (product.categories ?? [])
      .filter((c) => c.category)
      .map((c) => ({ name: c.category!.name, slug: c.category!.slug, is_primary: c.is_primary })),
    colorHex,
  };
}

export async function getRelatedProducts(productId: string, categorySlug: string | null): Promise<ProductCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("catalog");
  const supabase = createPublicClient();
  const { data: relations } = await supabase
    .from("product_relations")
    .select("related_product_id")
    .eq("product_id", productId)
    .order("sort_order")
    .limit(4);
  const ids = (relations ?? []).map((r) => r.related_product_id);
  let items: ProductCard[] = [];
  if (ids.length) {
    const { data } = await supabase.from("catalog_products").select("*").in("id", ids);
    items = (data ?? []) as unknown as ProductCard[];
  }
  if (items.length < 4 && categorySlug) {
    const category = await getCategoryBySlug(categorySlug);
    if (category) {
      const more = await searchProducts({ categoryId: category.id, sort: "bestsellers" });
      for (const p of more.items) {
        if (items.length >= 4) break;
        if (p.id !== productId && !items.some((i) => i.id === p.id)) items.push(p);
      }
    }
  }
  return items;
}

/** Slugs for the sitemap and for build-time prerendering. */
export async function getAllProductSlugs(): Promise<{ slug: string; updated_at: string }[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  const { data, error } = await createPublicClient()
    .from("products")
    .select("slug, updated_at")
    .eq("noindex", false)
    .order("sales_count", { ascending: false })
    .limit(5000);
  fail("getAllProductSlugs", error);
  return data ?? [];
}
