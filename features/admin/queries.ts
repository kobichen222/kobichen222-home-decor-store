import "server-only";
import { createSessionClient } from "@/lib/supabase/server";

export async function getProductFormOptions() {
  const db = await createSessionClient();
  const [categories, brands, attributes] = await Promise.all([
    db.from("categories").select("id, name, parent_id, sort_order").order("sort_order"),
    db.from("brands").select("id, name").order("name"),
    db.from("product_attributes").select("id, name, kind, sort_order, values:product_attribute_values(id, value, color_hex, sort_order)").order("sort_order"),
  ]);
  return {
    categories: categories.data ?? [],
    brands: brands.data ?? [],
    attributes: (attributes.data ?? []).map((a) => ({ ...a, values: [...a.values].sort((x, y) => x.sort_order - y.sort_order) })),
  };
}
export type ProductFormOptions = Awaited<ReturnType<typeof getProductFormOptions>>;

export async function getProductForEdit(id: string) {
  const db = await createSessionClient();
  const { data } = await db
    .from("products")
    .select(
      `*, private:product_private(cost_price),
       images:product_images(id, url, alt, is_primary, sort_order),
       categories:product_categories(category_id, is_primary),
       attributes:product_attribute_assignments(attribute_value_id),
       variants:product_variants(id, sku, name, options, price, sale_price, is_default, is_active, sort_order,
                                 inventory(on_hand, reserved, low_stock_threshold, allow_backorder))`,
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    images: [...data.images].sort((a, b) => a.sort_order - b.sort_order),
    variants: [...data.variants].sort((a, b) => a.sort_order - b.sort_order),
  };
}
export type ProductForEdit = NonNullable<Awaited<ReturnType<typeof getProductForEdit>>>;
