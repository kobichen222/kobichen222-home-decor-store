import "server-only";
import type { VariantOption } from "@/components/admin/quote-form";
import { createSessionClient } from "@/lib/supabase/server";

export async function variantOptions(): Promise<VariantOption[]> {
  const db = await createSessionClient();
  const { data } = await db
    .from("product_variants")
    .select("id, sku, name, price, product:products!inner(name, price, sale_price, status)")
    .eq("is_active", true)
    .neq("product.status", "archived")
    .order("sku");
  return (data ?? []).map((v) => ({
    id: v.id,
    label: `${v.product.name}${v.name ? ` · ${v.name}` : ""} (${v.sku})`,
    price: Number(v.price ?? v.product.sale_price ?? v.product.price),
  }));
}
