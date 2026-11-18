"use server";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { notifyOrderStatus } from "@/lib/email/notify";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { publicEnv } from "@/lib/env";
import { createSessionClient } from "@/lib/supabase/server";
import { categorySchema, productSchema, type ProductInput } from "@/lib/validations/product";

// Every action re-checks the caller's permission, then talks to the
// database as that user — so RLS enforces the same rule a second time.

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

function zodErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function dbMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") {
    if (error.message.includes("slug")) return "כתובת ה־URL כבר בשימוש";
    if (error.message.includes("sku")) return "המק״ט כבר קיים במערכת";
    return "ערך כפול: רשומה כזו כבר קיימת";
  }
  if (error.code === "42501") return "אין לך הרשאה לבצע פעולה זו";
  if (error.message.includes("BELOW_RESERVED")) return "לא ניתן להוריד מלאי מתחת לכמות השמורה להזמנות";
  return `שמירה נכשלה: ${error.message}`;
}

const bool = (fd: FormData, key: string) => fd.get(key) === "on";
const json = <T,>(fd: FormData, key: string, fallback: T): T => {
  try {
    return JSON.parse(String(fd.get(key) ?? "")) as T;
  } catch {
    return fallback;
  }
};

export async function saveProduct(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("catalog.manage");
  const id = z.uuid().safeParse(formData.get("id")).data ?? null;
  const get = (k: string) => formData.get(k);
  const parsed = productSchema.safeParse({
    name: get("name"),
    slug: get("slug") || String(get("sku") ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    sku: get("sku"),
    short_description: get("short_description"),
    description: get("description"),
    brand_id: get("brand_id") ?? "",
    status: get("status"),
    is_featured: bool(formData, "is_featured"),
    price: get("price"),
    sale_price: get("sale_price"),
    cost_price: get("cost_price"),
    sale_starts_at: get("sale_starts_at"),
    sale_ends_at: get("sale_ends_at"),
    specs: json(formData, "specs", []),
    width_cm: get("width_cm"),
    height_cm: get("height_cm"),
    depth_cm: get("depth_cm"),
    weight_kg: get("weight_kg"),
    installation_instructions: get("installation_instructions"),
    care_instructions: get("care_instructions"),
    delivery_days_min: get("delivery_days_min"),
    delivery_days_max: get("delivery_days_max"),
    shipping_weight_kg: get("shipping_weight_kg"),
    handling_days: get("handling_days"),
    seo_title: get("seo_title"),
    seo_description: get("seo_description"),
    noindex: bool(formData, "noindex"),
    category_ids: formData.getAll("category_ids"),
    primary_category_id: get("primary_category_id") ?? "",
    attribute_value_ids: formData.getAll("attribute_value_ids"),
    variants: json(formData, "variants", []),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error), message: "נא לתקן את השדות המסומנים" };
  const v: ProductInput = parsed.data;
  const db = await createSessionClient();

  const row = {
    name: v.name,
    slug: v.slug,
    sku: v.sku,
    short_description: v.short_description,
    description: v.description,
    brand_id: v.brand_id,
    status: v.status,
    is_featured: v.is_featured,
    price: v.price,
    sale_price: v.sale_price,
    sale_starts_at: v.sale_starts_at?.toISOString() ?? null,
    sale_ends_at: v.sale_ends_at?.toISOString() ?? null,
    specs: v.specs,
    width_cm: v.width_cm,
    height_cm: v.height_cm,
    depth_cm: v.depth_cm,
    weight_kg: v.weight_kg,
    installation_instructions: v.installation_instructions,
    care_instructions: v.care_instructions,
    delivery_days_min: v.delivery_days_min,
    delivery_days_max: v.delivery_days_max,
    shipping_weight_kg: v.shipping_weight_kg,
    handling_days: v.handling_days,
    seo_title: v.seo_title,
    seo_description: v.seo_description,
    noindex: v.noindex,
  };

  let productId = id;
  if (productId) {
    const { error } = await db.from("products").update(row).eq("id", productId);
    if (error) return { message: dbMessage(error) };
  } else {
    const { data, error } = await db
      .from("products")
      .insert({ ...row, published_at: v.status === "active" ? new Date().toISOString() : null })
      .select("id")
      .single();
    if (error) return { message: dbMessage(error) };
    productId = data.id;
  }

  const steps: (() => PromiseLike<{ error: { code?: string; message: string } | null }>)[] = [
    () => db.from("product_private").upsert({ product_id: productId!, cost_price: v.cost_price }),
    // Categories and attributes are replaced as sets.
    () => db.from("product_categories").delete().eq("product_id", productId!),
    () =>
      v.category_ids.length
        ? db.from("product_categories").insert(
            v.category_ids.map((category_id, i) => ({
              product_id: productId!,
              category_id,
              is_primary: v.primary_category_id ? category_id === v.primary_category_id : i === 0,
            })),
          )
        : Promise.resolve({ error: null }),
    () => db.from("product_attribute_assignments").delete().eq("product_id", productId!),
    () =>
      v.attribute_value_ids.length
        ? db
            .from("product_attribute_assignments")
            .insert(v.attribute_value_ids.map((attribute_value_id) => ({ product_id: productId!, attribute_value_id })))
        : Promise.resolve({ error: null }),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) return { message: dbMessage(error) };
  }

  // Variants: delete the removed ones, then update / insert the rest.
  const defaultIndex = Math.max(0, v.variants.findIndex((x) => x.is_default));
  const keepIds = v.variants.map((x) => x.id).filter(Boolean) as string[];
  const { data: existing } = await db.from("product_variants").select("id").eq("product_id", productId);
  const removed = (existing ?? []).map((e) => e.id).filter((eid) => !keepIds.includes(eid));
  if (removed.length) {
    const { error } = await db.from("product_variants").delete().in("id", removed);
    if (error) return { message: dbMessage(error) };
  }
  // Clear the default flag first so the "one default per product" index
  // never sees two defaults while rows are updated one by one.
  await db.from("product_variants").update({ is_default: false }).eq("product_id", productId);
  for (const [i, variant] of v.variants.entries()) {
    const variantRow = {
      product_id: productId,
      sku: variant.sku,
      name: variant.name,
      options: variant.options,
      price: variant.price,
      sale_price: variant.sale_price,
      is_default: i === defaultIndex,
      is_active: variant.is_active,
      sort_order: i,
    };
    let variantId = variant.id;
    if (variantId) {
      const { error } = await db.from("product_variants").update(variantRow).eq("id", variantId).eq("product_id", productId);
      if (error) return { message: dbMessage(error) };
    } else {
      const { data, error } = await db.from("product_variants").insert(variantRow).select("id").single();
      if (error) return { message: dbMessage(error) };
      variantId = data.id;
    }
    if (admin.permissions.includes("inventory.manage")) {
      const { error: invError } = await db
        .from("inventory")
        .update({ low_stock_threshold: variant.low_stock_threshold, allow_backorder: variant.allow_backorder })
        .eq("variant_id", variantId);
      if (invError) return { message: dbMessage(invError) };
      const { error: stockError } = await db.rpc("admin_set_stock", {
        p_variant_id: variantId,
        p_on_hand: variant.on_hand,
        p_note: "עדכון מטופס המוצר",
      });
      if (stockError) return { message: dbMessage(stockError) };
    }
  }

  updateTag("catalog");
  // Reload the page from the database so the form shows exactly what was stored.
  redirect(`/admin/products/${productId}?${id ? `saved=${Date.now()}` : "created=1"}`);
}

export async function setProductStatus(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(formData.get("id"));
  const status = z.enum(["draft", "active", "archived"]).parse(formData.get("status"));
  const db = await createSessionClient();
  const { error } = await db.from("products").update({ status }).eq("id", id);
  if (error) throw new Error(dbMessage(error));
  updateTag("catalog");
}

export async function duplicateProduct(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(formData.get("id"));
  const db = await createSessionClient();
  const { data: src, error } = await db
    .from("products")
    .select("*, product_categories(category_id, is_primary), product_attribute_assignments(attribute_value_id), product_variants(*)")
    .eq("id", id)
    .single();
  if (error || !src) throw new Error("המוצר לא נמצא");
  const suffix = Date.now().toString(36).slice(-5);
  const { product_categories, product_attribute_assignments, product_variants, ...row } = src;
  const fields: Partial<typeof row> = { ...row };
  for (const key of ["id", "created_at", "updated_at", "search_text", "sales_count", "published_at"] as const) delete fields[key];
  const { data: copy, error: insertError } = await db
    .from("products")
    .insert({ ...fields, price: src.price, name: `${src.name} (עותק)`, slug: `${src.slug}-copy-${suffix}`, sku: `${src.sku}-C${suffix.toUpperCase()}`, status: "draft" })
    .select("id")
    .single();
  if (insertError || !copy) throw new Error(dbMessage(insertError!));
  if (product_categories.length) await db.from("product_categories").insert(product_categories.map((c) => ({ ...c, product_id: copy.id })));
  if (product_attribute_assignments.length)
    await db.from("product_attribute_assignments").insert(product_attribute_assignments.map((a) => ({ ...a, product_id: copy.id })));
  await db.from("product_variants").insert(
    product_variants.map((pv, i) => ({
      product_id: copy.id,
      sku: `${pv.sku}-C${suffix.toUpperCase()}`,
      name: pv.name,
      options: pv.options,
      price: pv.price,
      sale_price: pv.sale_price,
      is_default: pv.is_default,
      is_active: pv.is_active,
      sort_order: i,
    })),
  );
  redirect(`/admin/products/${copy.id}`);
}

// ---- Images -------------------------------------------------------------
const imagePath = z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/);

export async function addProductImage(productId: string, storagePath: string, alt: string): Promise<FormState> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(productId);
  const path = imagePath.parse(storagePath);
  if (!path.startsWith(`products/${id}/`)) return { message: "נתיב הקובץ אינו תואם למוצר" };
  const db = await createSessionClient();
  const { data: last } = await db.from("product_images").select("sort_order").eq("product_id", id).order("sort_order", { ascending: false }).limit(1);
  const { count } = await db.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id);
  const url = `${publicEnv().supabaseUrl}/storage/v1/object/public/media/${path}`;
  const { error } = await db.from("product_images").insert({
    product_id: id,
    url,
    storage_path: path,
    alt: alt.trim().slice(0, 200) || null,
    sort_order: (last?.[0]?.sort_order ?? -1) + 1,
    is_primary: (count ?? 0) === 0,
  });
  if (error) return { message: dbMessage(error) };
  updateTag("catalog");
  return { ok: true };
}

export async function updateProductImage(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(formData.get("id"));
  const productId = z.uuid().parse(formData.get("product_id"));
  const intent = z.enum(["primary", "delete", "alt", "up", "down"]).parse(formData.get("intent"));
  const db = await createSessionClient();
  if (intent === "primary") {
    await db.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await db.from("product_images").update({ is_primary: true }).eq("id", id).eq("product_id", productId);
  } else if (intent === "alt") {
    await db.from("product_images").update({ alt: String(formData.get("alt") ?? "").trim().slice(0, 200) || null }).eq("id", id);
  } else if (intent === "delete") {
    const { data: image } = await db.from("product_images").delete().eq("id", id).eq("product_id", productId).select("storage_path, is_primary").maybeSingle();
    if (image?.storage_path) await db.storage.from("media").remove([image.storage_path]);
    if (image?.is_primary) {
      const { data: next } = await db.from("product_images").select("id").eq("product_id", productId).order("sort_order").limit(1);
      if (next?.[0]) await db.from("product_images").update({ is_primary: true }).eq("id", next[0].id);
    }
  } else {
    const { data: images } = await db.from("product_images").select("id, sort_order").eq("product_id", productId).order("sort_order");
    const list = images ?? [];
    const i = list.findIndex((img) => img.id === id);
    const j = intent === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      for (const [order, img] of list.entries()) await db.from("product_images").update({ sort_order: order }).eq("id", img.id);
    }
  }
  updateTag("catalog");
}

// ---- Categories ---------------------------------------------------------
export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().safeParse(formData.get("id")).data ?? null;
  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    parent_id: formData.get("parent_id") ?? "",
    description: formData.get("description"),
    image_url: formData.get("image_url"),
    sort_order: formData.get("sort_order") || 0,
    is_active: bool(formData, "is_active"),
    show_on_home: bool(formData, "show_on_home"),
    seo_title: formData.get("seo_title"),
    seo_description: formData.get("seo_description"),
  });
  if (!parsed.success) return { errors: zodErrors(parsed.error), message: "נא לתקן את השדות המסומנים" };
  if (id && parsed.data.parent_id === id) return { errors: { parent_id: "קטגוריה אינה יכולה להיות האב של עצמה" } };
  const db = await createSessionClient();
  const { error } = id
    ? await db.from("categories").update(parsed.data).eq("id", id)
    : await db.from("categories").insert(parsed.data);
  if (error) return { message: dbMessage(error) };
  updateTag("catalog");
  redirect("/admin/categories");
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(formData.get("id"));
  const db = await createSessionClient();
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) throw new Error(dbMessage(error));
  updateTag("catalog");
  redirect("/admin/categories");
}

// ---- Inventory ----------------------------------------------------------
export async function setStock(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("inventory.manage");
  const parsed = z
    .object({ variant_id: z.uuid(), on_hand: z.coerce.number().int().min(0).max(1_000_000), note: z.string().max(200).optional() })
    .safeParse({ variant_id: formData.get("variant_id"), on_hand: formData.get("on_hand"), note: formData.get("note") ?? undefined });
  if (!parsed.success) return { message: "כמות לא תקינה" };
  const db = await createSessionClient();
  const { error } = await db.rpc("admin_set_stock", {
    p_variant_id: parsed.data.variant_id,
    p_on_hand: parsed.data.on_hand,
    p_note: parsed.data.note || "התאמה ידנית",
  });
  if (error) return { message: dbMessage(error) };
  updateTag("catalog");
  return { ok: true, message: "עודכן" };
}

// ---- Orders -------------------------------------------------------------
export async function setOrderStatus(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin("orders.manage");
  const parsed = z
    .object({
      id: z.uuid(),
      status: z.enum(["processing", "preparing", "ready_to_ship", "shipped", "delivered", "cancelled", "returned"]),
      tracking: z.string().trim().max(60).optional(),
    })
    .safeParse({ id: formData.get("id"), status: formData.get("status"), tracking: formData.get("tracking") ?? undefined });
  if (!parsed.success) return { message: "בקשה לא תקינה" };
  const db = await createSessionClient();
  const { error } = await db.rpc("admin_set_order_status", {
    p_order_id: parsed.data.id,
    p_status: parsed.data.status,
    p_tracking: parsed.data.tracking,
  });
  if (error) {
    return { message: error.message.includes("ORDER_NOT_PAID") ? "לא ניתן לקדם הזמנה שלא שולמה" : dbMessage(error) };
  }
  updateTag("catalog");
  // Customers hear about the steps that matter to them.
  const CUSTOMER_LABELS: Record<string, string> = { shipped: "נשלחה", delivered: "נמסרה", ready_to_ship: "מוכנה לאיסוף/משלוח", cancelled: "בוטלה" };
  const label = CUSTOMER_LABELS[parsed.data.status];
  if (label && formData.get("notify") === "on") after(() => notifyOrderStatus(parsed.data.id, label).then(() => undefined));
  return { ok: true, message: label && formData.get("notify") === "on" ? "הסטטוס עודכן ונשלחה הודעה ללקוח" : "הסטטוס עודכן" };
}

export async function addOrderNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin("orders.manage");
  const parsed = z.object({ id: z.uuid(), note: z.string().trim().min(1).max(1000) }).safeParse({ id: formData.get("id"), note: formData.get("note") });
  if (!parsed.success) return { message: "נא להזין הערה" };
  const db = await createSessionClient();
  const { error } = await db.from("order_events").insert({ order_id: parsed.data.id, type: "note", data: { text: parsed.data.note }, actor_id: admin.userId });
  if (error) return { message: dbMessage(error) };
  return { ok: true };
}

// ---- Videos -------------------------------------------------------------
const videoPath = z.string().regex(/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(mp4|webm|mov)$/);

/** YouTube URL or bare id → the 11-character video id. */
function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?]+)/)?.[1] ?? null;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export async function addProductVideo(
  productId: string,
  input: { storagePath?: string; youtube?: string; title?: string },
): Promise<FormState> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(productId);
  const db = await createSessionClient();
  let row: { kind: "file" | "youtube"; url: string; storage_path: string | null };
  if (input.storagePath) {
    const path = videoPath.safeParse(input.storagePath);
    if (!path.success || !path.data.startsWith(`products/${id}/`)) return { message: "נתיב הקובץ אינו תקין" };
    row = { kind: "file", url: `${publicEnv().supabaseUrl}/storage/v1/object/public/product-videos/${path.data}`, storage_path: path.data };
  } else {
    const yt = youtubeId(input.youtube ?? "");
    if (!yt) return { message: "קישור YouTube אינו תקין" };
    row = { kind: "youtube", url: yt, storage_path: null };
  }
  const { data: last } = await db.from("product_videos").select("sort_order").eq("product_id", id).order("sort_order", { ascending: false }).limit(1);
  const { error } = await db.from("product_videos").insert({
    product_id: id,
    ...row,
    title: input.title?.trim().slice(0, 120) || null,
    sort_order: (last?.[0]?.sort_order ?? -1) + 1,
  });
  if (error) return { message: dbMessage(error) };
  updateTag("catalog");
  return { ok: true };
}

export async function updateProductVideo(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage");
  const id = z.uuid().parse(formData.get("id"));
  const productId = z.uuid().parse(formData.get("product_id"));
  const intent = z.enum(["delete", "up", "down", "title"]).parse(formData.get("intent"));
  const db = await createSessionClient();
  if (intent === "delete") {
    const { data: video } = await db.from("product_videos").delete().eq("id", id).eq("product_id", productId).select("storage_path").maybeSingle();
    if (video?.storage_path) await db.storage.from("product-videos").remove([video.storage_path]);
  } else if (intent === "title") {
    await db.from("product_videos").update({ title: String(formData.get("title") ?? "").trim().slice(0, 120) || null }).eq("id", id).eq("product_id", productId);
  } else {
    const { data } = await db.from("product_videos").select("id").eq("product_id", productId).order("sort_order");
    const list = data ?? [];
    const i = list.findIndex((v) => v.id === id);
    const j = intent === "up" ? i - 1 : i + 1;
    if (i >= 0 && j >= 0 && j < list.length) {
      [list[i], list[j]] = [list[j], list[i]];
      for (const [order, v] of list.entries()) await db.from("product_videos").update({ sort_order: order }).eq("id", v.id);
    }
  }
  updateTag("catalog");
}
