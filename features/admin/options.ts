import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Option } from "@/components/admin/resource-types";

export async function loadOptions(db: SupabaseClient, source: "categories" | "products" | "blog_categories"): Promise<Option[]> {
  if (source === "categories") {
    const { data } = await db.from("categories").select("id, name, parent_id, sort_order").order("sort_order");
    const all = (data ?? []) as { id: string; name: string; parent_id: string | null }[];
    return all
      .filter((c) => !c.parent_id)
      .flatMap((root) => [root, ...all.filter((c) => c.parent_id === root.id)])
      .map((c) => ({ value: c.id, label: c.parent_id ? `— ${c.name}` : c.name }));
  }
  if (source === "products") {
    const { data } = await db.from("products").select("id, name, sku").neq("status", "archived").order("name");
    return ((data ?? []) as { id: string; name: string; sku: string }[]).map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));
  }
  const { data } = await db.from("blog_categories").select("id, name").order("name");
  return ((data ?? []) as { id: string; name: string }[]).map((c) => ({ value: c.id, label: c.name }));
}
