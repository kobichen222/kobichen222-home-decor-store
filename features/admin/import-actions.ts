"use server";
import { updateTag } from "next/cache";
import { z } from "zod";
import { can, requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const IMPORT_FIELDS = [
  ["sku", "מק״ט (חובה)"],
  ["name", "שם מוצר"],
  ["price", "מחיר"],
  ["sale_price", "מחיר מבצע"],
  ["stock", "כמות במלאי"],
  ["category", "קטגוריה (שם או כתובת)"],
  ["status", "סטטוס (פעיל/טיוטה)"],
  ["short_description", "תיאור קצר"],
  ["description", "תיאור מלא"],
  ["slug", "כתובת URL"],
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number][0];
export type ImportRow = Partial<Record<ImportField, string>>;
export type RowResult = { row: number; sku: string; action: "create" | "update" | "skip" | "error"; message?: string };

const num = (v: string | undefined) => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v.replace(/[₪,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
const STATUS: Record<string, "active" | "draft" | "archived"> = {
  active: "active", "פעיל": "active", draft: "draft", "טיוטה": "draft", archived: "archived", "ארכיון": "archived",
};
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function validate(r: ImportRow) {
  const errors: string[] = [];
  const sku = (r.sku ?? "").trim();
  if (!sku) errors.push("חסר מק״ט");
  if (sku.length > 60) errors.push("מק״ט ארוך מדי");
  const price = num(r.price);
  const sale = num(r.sale_price);
  const stock = num(r.stock);
  if (Number.isNaN(price)) errors.push("מחיר לא תקין");
  if (Number.isNaN(sale)) errors.push("מחיר מבצע לא תקין");
  if (Number.isNaN(stock) || (stock !== undefined && !Number.isInteger(stock))) errors.push("כמות לא תקינה");
  if (sale !== undefined && price !== undefined && sale >= price) errors.push("מחיר המבצע חייב להיות נמוך מהמחיר");
  const status = r.status?.trim() ? STATUS[r.status.trim().toLowerCase()] : undefined;
  if (r.status?.trim() && !status) errors.push("סטטוס לא מוכר");
  return { sku, price, sale, stock, status, errors };
}

/**
 * dryRun: classify every row (create / update / error) without writing.
 * Otherwise: write the valid rows. Existing products are matched by SKU and
 * only the mapped columns are changed.
 */
export async function importProducts(rows: ImportRow[], dryRun: boolean): Promise<{ results: RowResult[]; message?: string }> {
  const admin = await requireAdmin("catalog.manage");
  const list = z.array(z.record(z.string(), z.string().max(10000))).max(2000).safeParse(rows);
  if (!list.success) return { results: [], message: "קובץ גדול מדי (עד 2,000 שורות) או לא תקין" };
  const db = await createSessionClient();

  const skus = [...new Set(list.data.map((r) => (r.sku ?? "").trim()).filter(Boolean))];
  const [{ data: products }, { data: categories }] = await Promise.all([
    db.from("products").select("id, sku, price, variants:product_variants(id, sku, is_default)").in("sku", skus.length ? skus : ["-"]),
    db.from("categories").select("id, name, slug"),
  ]);
  const bySku = new Map((products ?? []).map((p) => [p.sku, p]));
  const findCategory = (v?: string) => {
    const t = v?.trim().toLowerCase();
    if (!t) return null;
    return (categories ?? []).find((c) => c.slug === t || c.name.toLowerCase() === t) ?? undefined;
  };

  const seen = new Set<string>();
  const results: RowResult[] = [];
  for (const [i, raw] of (list.data as ImportRow[]).entries()) {
    const n = i + 2; // spreadsheet row number (header is row 1)
    const v = validate(raw);
    const existing = bySku.get(v.sku);
    const category = findCategory(raw.category);
    if (category === undefined) v.errors.push(`קטגוריה לא נמצאה: ${raw.category}`);
    if (seen.has(v.sku)) v.errors.push("מק״ט כפול בקובץ");
    seen.add(v.sku);
    if (!existing && !raw.name?.trim()) v.errors.push("מוצר חדש: חסר שם");
    if (!existing && v.price === undefined) v.errors.push("מוצר חדש: חסר מחיר");
    if (v.errors.length) { results.push({ row: n, sku: v.sku, action: "error", message: v.errors.join(" · ") }); continue; }
    if (v.stock !== undefined && !can(admin, "inventory.manage")) { results.push({ row: n, sku: v.sku, action: "error", message: "אין הרשאת מלאי" }); continue; }
    if (dryRun) { results.push({ row: n, sku: v.sku, action: existing ? "update" : "create" }); continue; }

    try {
      let productId = existing?.id;
      let variantId = existing?.variants.find((x) => x.is_default)?.id ?? existing?.variants[0]?.id;
      const fields: Record<string, unknown> = {};
      if (raw.name?.trim()) fields.name = raw.name.trim().slice(0, 160);
      if (v.price !== undefined) fields.price = v.price;
      if (raw.sale_price !== undefined) fields.sale_price = v.sale ?? null;
      if (v.status) fields.status = v.status;
      if (raw.short_description !== undefined) fields.short_description = raw.short_description.trim() || null;
      if (raw.description !== undefined) fields.description = raw.description.trim() || null;
      if (existing) {
        if (Object.keys(fields).length) {
          const { error } = await db.from("products").update(fields as never).eq("id", existing.id);
          if (error) throw error;
        }
      } else {
        const slug = (raw.slug?.trim() && slugify(raw.slug)) || slugify(v.sku) || `p-${Date.now()}`;
        const { data, error } = await db
          .from("products")
          .insert({ ...(fields as object), sku: v.sku, slug, name: fields.name as string, price: v.price as number, status: v.status ?? "draft" } as never)
          .select("id")
          .single();
        if (error) throw error;
        productId = data.id;
        const { data: variant, error: vErr } = await db.from("product_variants").insert({ product_id: productId, sku: v.sku, is_default: true, options: {} }).select("id").single();
        if (vErr) throw vErr;
        variantId = variant.id;
      }
      if (category && productId) {
        await db.from("product_categories").upsert({ product_id: productId, category_id: category.id, is_primary: !existing }, { onConflict: "product_id,category_id" });
      }
      if (v.stock !== undefined && variantId) {
        const { error } = await db.rpc("admin_set_stock", { p_variant_id: variantId, p_on_hand: v.stock, p_note: "ייבוא מקובץ" });
        if (error) throw error;
      }
      results.push({ row: n, sku: v.sku, action: existing ? "update" : "create" });
    } catch (e) {
      const msg = (e as { message?: string; code?: string }).code === "23505" ? "כתובת URL או מק״ט כבר קיימים" : (e as Error).message;
      results.push({ row: n, sku: v.sku, action: "error", message: msg });
    }
  }
  if (!dryRun) updateTag("catalog");
  return { results };
}
