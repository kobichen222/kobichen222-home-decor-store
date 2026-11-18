"use server";
import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionState = { ok?: boolean; message?: string; errors?: Record<string, string>; secret?: string } | null;

const text = (max: number) => z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max).nullable());
const issues = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0] ?? "form"), i.message]));

// ---------- Customers ----------------------------------------------------
export async function addCustomerNote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin("customers.manage");
  const parsed = z
    .object({ email: z.email(), note: z.string().trim().min(1, "נא להזין הערה").max(2000) })
    .safeParse({ email: formData.get("email"), note: formData.get("note") });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const db = await createSessionClient();
  const { data: profile } = await db.from("profiles").select("id").ilike("email", parsed.data.email).maybeSingle();
  const { error } = await db.from("customer_notes").insert({
    email: parsed.data.email.toLowerCase(),
    user_id: profile?.id ?? null,
    note: parsed.data.note,
    created_by: admin.userId,
  });
  return error ? { message: `השמירה נכשלה: ${error.message}` } : { ok: true };
}

// ---------- Refunds ------------------------------------------------------
export async function recordRefund(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("orders.manage");
  const parsed = z
    .object({
      id: z.uuid(),
      amount: z.coerce.number({ error: "סכום לא תקין" }).positive("סכום לא תקין"),
      reason: z.string().trim().max(300).optional(),
      restock: z.boolean(),
    })
    .safeParse({ id: formData.get("id"), amount: formData.get("amount"), reason: formData.get("reason") ?? undefined, restock: formData.get("restock") === "on" });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const db = await createSessionClient();
  const { error } = await db.rpc("admin_record_refund", {
    p_order_id: parsed.data.id,
    p_amount: parsed.data.amount,
    p_reason: parsed.data.reason ?? "",
    p_restock: parsed.data.restock,
  });
  if (error) {
    const known: Record<string, string> = {
      AMOUNT_INVALID: "הסכום גבוה מהיתרה שעוד לא הוחזרה",
      ORDER_NOT_PAID: "ניתן לרשום החזר רק להזמנה ששולמה",
      FORBIDDEN: "אין לך הרשאה",
    };
    return { message: known[Object.keys(known).find((k) => error.message.includes(k)) ?? ""] ?? error.message };
  }
  if (parsed.data.restock) updateTag("catalog");
  return { ok: true, message: "ההחזר נרשם" };
}

// ---------- Quotes -------------------------------------------------------
const quoteSchema = z.object({
  customer_name: z.string().trim().min(2, "נא להזין שם לקוח").max(120),
  company_name: text(120),
  email: z.preprocess((v) => (v === "" ? null : v), z.email("דוא״ל לא תקין").nullable()),
  phone: text(30),
  status: z.enum(["draft", "sent", "accepted", "rejected", "expired"]),
  valid_until: z.preprocess((v) => (v === "" ? null : v), z.iso.date().nullable()),
  notes: text(3000),
  lead_id: z.preprocess((v) => (v === "" || v == null ? null : v), z.uuid().nullable()),
  items: z
    .array(
      z.object({
        variant_id: z.preprocess((v) => (v === "" ? null : v), z.uuid().nullable()),
        description: z.string().trim().min(1, "חסר תיאור לשורה").max(300),
        quantity: z.coerce.number().int().min(1, "כמות לא תקינה").max(100_000),
        unit_price: z.coerce.number().min(0, "מחיר לא תקין").max(10_000_000),
      }),
    )
    .min(1, "נדרשת לפחות שורה אחת")
    .max(200),
});

export async function saveQuote(id: string | null, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("orders.manage");
  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {}
  const parsed = quoteSchema.safeParse({ ...Object.fromEntries(formData), items });
  if (!parsed.success) return { errors: issues(parsed.error), message: parsed.error.issues[0].message };
  const { items: lines, ...header } = parsed.data;
  const db = await createSessionClient();
  let quoteId = id;
  if (id) {
    const { error } = await db.from("business_quotes").update(header).eq("id", id);
    if (error) return { message: error.message };
    await db.from("business_quote_items").delete().eq("quote_id", id);
  } else {
    const { data, error } = await db.from("business_quotes").insert(header).select("id").single();
    if (error) return { message: error.message };
    quoteId = data.id;
  }
  const { error } = await db.from("business_quote_items").insert(lines.map((l, i) => ({ ...l, quote_id: quoteId!, sort_order: i })));
  if (error) return { message: error.message };
  redirect(`/admin/quotes/${quoteId}?saved=${Date.now()}`);
}

export async function deleteQuote(formData: FormData): Promise<void> {
  await requireAdmin("orders.manage");
  const db = await createSessionClient();
  await db.from("business_quotes").delete().eq("id", z.uuid().parse(formData.get("id")));
  redirect("/admin/quotes");
}

// ---------- Store settings ----------------------------------------------
const settingsSchema = z.object({
  business: z.object({
    name: z.string().trim().min(2, "נא להזין שם עסק").max(80),
    tagline: z.string().trim().max(160),
    phone: z.string().trim().max(30),
    whatsapp: z.string().trim().regex(/^\d{0,15}$/, "וואטסאפ: ספרות בלבד, בפורמט בינלאומי (9725…)"),
    email: z.union([z.literal(""), z.email("דוא״ל לא תקין")]),
    address: z.string().trim().max(200),
    hours: z.string().trim().max(160),
    company_name: z.string().trim().max(120),
    company_number: z.string().trim().max(20),
    social: z.object({ instagram: z.string().trim().max(300), facebook: z.string().trim().max(300) }),
  }),
  commerce: z.object({
    vat_rate: z.coerce.number().min(0, "מע״מ לא תקין").max(50, "מע״מ לא תקין"),
    reservation_minutes: z.coerce.number().int().min(5, "לפחות 5 דקות").max(1440),
  }),
  seo: z.object({ title: z.string().trim().min(2).max(70), description: z.string().trim().max(170) }),
});

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("settings.manage");
  const g = (k: string) => String(formData.get(k) ?? "");
  const parsed = settingsSchema.safeParse({
    business: {
      name: g("name"), tagline: g("tagline"), phone: g("phone"), whatsapp: g("whatsapp").replace(/\D/g, ""), email: g("email"),
      address: g("address"), hours: g("hours"), company_name: g("company_name"), company_number: g("company_number"),
      social: { instagram: g("instagram"), facebook: g("facebook") },
    },
    commerce: { vat_rate: g("vat_rate"), reservation_minutes: g("reservation_minutes") },
    seo: { title: g("seo_title"), description: g("seo_description") },
  });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const db = await createSessionClient();
  const { data: current } = await db.from("store_settings").select("value").eq("key", "commerce").maybeSingle();
  const rows = [
    { key: "business", value: parsed.data.business, is_public: true },
    { key: "commerce", value: { ...((current?.value as object) ?? {}), ...parsed.data.commerce }, is_public: true },
    { key: "seo", value: parsed.data.seo, is_public: true },
  ];
  const { error } = await db.from("store_settings").upsert(rows);
  if (error) return { message: error.message };
  updateTag("settings");
  return { ok: true, message: "ההגדרות נשמרו" };
}

// ---------- Admin users -------------------------------------------------
export async function addAdminUser(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("users.manage");
  const parsed = z.object({ email: z.email("דוא״ל לא תקין"), role_id: z.uuid("נא לבחור תפקיד") }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role_id: formData.get("role_id"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const session = await createSessionClient();
  const { data: role } = await session.from("admin_roles").select("id, code").eq("id", parsed.data.role_id).single();
  if (!role) return { message: "תפקיד לא קיים" };
  const { data: isOwner } = await session.rpc("is_owner");
  if (role.code === "owner" && !isOwner) return { message: "רק בעלים יכולים למנות בעלים" };

  // Creating a login needs the auth admin API (server secret). Permission
  // was checked above; the role row itself is written as the signed-in admin.
  const service = createServiceClient();
  let secret: string | undefined;
  let userId: string | undefined;
  const { data: list } = await service.auth.admin.listUsers({ perPage: 1000 });
  userId = list?.users.find((u) => u.email?.toLowerCase() === parsed.data.email)?.id;
  if (!userId) {
    secret = randomBytes(9).toString("base64url");
    const { data, error } = await service.auth.admin.createUser({ email: parsed.data.email, password: secret, email_confirm: true });
    if (error || !data.user) return { message: `יצירת המשתמש נכשלה: ${error?.message}` };
    userId = data.user.id;
  }
  const { error } = await session.from("admin_user_roles").upsert({ user_id: userId, role_id: role.id });
  if (error) return { message: error.message.includes("OWNER_ONLY") ? "רק בעלים יכולים למנות בעלים" : error.message };
  return {
    ok: true,
    secret,
    message: secret ? `נוצר משתמש עבור ${parsed.data.email}` : `התפקיד נוסף למשתמש הקיים ${parsed.data.email}`,
  };
}

export async function setUserRoles(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin("users.manage");
  const userId = z.uuid().parse(formData.get("user_id"));
  const wanted = z.array(z.uuid()).parse(formData.getAll("role_ids"));
  const db = await createSessionClient();
  const { data: current } = await db.from("admin_user_roles").select("role_id").eq("user_id", userId);
  const have = (current ?? []).map((r) => r.role_id);
  if (userId === admin.userId && wanted.length === 0) return { message: "לא ניתן להסיר את כל ההרשאות מעצמך" };
  for (const roleId of wanted.filter((r) => !have.includes(r))) {
    const { error } = await db.from("admin_user_roles").insert({ user_id: userId, role_id: roleId });
    if (error) return { message: error.message.includes("OWNER_ONLY") ? "רק בעלים יכולים למנות בעלים" : error.message };
  }
  for (const roleId of have.filter((r) => !wanted.includes(r))) {
    const { error } = await db.from("admin_user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
    if (error) {
      if (error.message.includes("LAST_OWNER")) return { message: "חייב להישאר לפחות בעלים אחד" };
      if (error.message.includes("OWNER_ONLY")) return { message: "רק בעלים יכולים להסיר בעלים" };
      return { message: error.message };
    }
  }
  return { ok: true, message: wanted.length ? "ההרשאות עודכנו" : "הגישה למערכת הניהול הוסרה" };
}

// ---------- Media library ------------------------------------------------
export async function deleteMedia(formData: FormData): Promise<void> {
  await requireAdmin("catalog.manage", "content.manage");
  const path = z.string().regex(/^library\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/).parse(formData.get("path"));
  const db = await createSessionClient();
  const needle = `%/media/${path}%`;
  const checks = await Promise.all([
    db.from("product_images").select("id", { count: "exact", head: true }).ilike("url", needle),
    db.from("categories").select("id", { count: "exact", head: true }).or(`image_url.ilike.${needle},banner_url.ilike.${needle}`),
    db.from("collections").select("id", { count: "exact", head: true }).ilike("image_url", needle),
    db.from("brands").select("id", { count: "exact", head: true }).ilike("logo_url", needle),
    db.from("blog_posts").select("id", { count: "exact", head: true }).ilike("cover_image_url", needle),
    db.from("page_sections").select("id", { count: "exact", head: true }).ilike("data::text", needle),
  ]);
  if (checks.some((c) => (c.count ?? 0) > 0)) redirect("/admin/media?error=in_use");
  const { error } = await db.storage.from("media").remove([path]);
  redirect(error ? "/admin/media?error=failed" : "/admin/media?deleted=1");
}

// ---------- Home page sections -----------------------------------------
const SECTION_KINDS = ["hero", "banner", "text_image", "categories", "product_grid", "rooms", "collections", "benefits", "newsletter"] as const;

async function homePageId() {
  const db = await createSessionClient();
  const { data } = await db.from("pages").select("id").eq("slug", "home").single();
  return { db, pageId: data!.id };
}

export async function addSection(formData: FormData): Promise<void> {
  await requireAdmin("content.manage");
  const kind = z.enum(SECTION_KINDS).parse(formData.get("kind"));
  const { db, pageId } = await homePageId();
  const { data: last } = await db.from("page_sections").select("sort_order").eq("page_id", pageId).order("sort_order", { ascending: false }).limit(1);
  const { data, error } = await db
    .from("page_sections")
    .insert({ page_id: pageId, kind, title: null, data: {}, sort_order: (last?.[0]?.sort_order ?? 0) + 10, is_active: false })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/admin/home/${data.id}`);
}

export async function moveSection(formData: FormData): Promise<void> {
  await requireAdmin("content.manage");
  const id = z.uuid().parse(formData.get("id"));
  const dir = z.enum(["up", "down"]).parse(formData.get("dir"));
  const { db, pageId } = await homePageId();
  const { data } = await db.from("page_sections").select("id, sort_order").eq("page_id", pageId).order("sort_order");
  const list = data ?? [];
  const i = list.findIndex((s) => s.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i >= 0 && j >= 0 && j < list.length) {
    [list[i], list[j]] = [list[j], list[i]];
    for (const [n, s] of list.entries()) await db.from("page_sections").update({ sort_order: (n + 1) * 10 }).eq("id", s.id);
  }
  updateTag("content");
}

export async function toggleSection(formData: FormData): Promise<void> {
  await requireAdmin("content.manage");
  const db = await createSessionClient();
  await db.from("page_sections").update({ is_active: formData.get("active") === "true" }).eq("id", z.uuid().parse(formData.get("id")));
  updateTag("content");
}

export async function deleteSection(formData: FormData): Promise<void> {
  await requireAdmin("content.manage");
  const db = await createSessionClient();
  await db.from("page_sections").delete().eq("id", z.uuid().parse(formData.get("id")));
  updateTag("content");
  redirect("/admin/home");
}

const link = z.object({ label: z.string().trim().max(60), href: z.string().trim().max(300) });
const lines = (v: FormDataEntryValue | null) => String(v ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

export async function saveSection(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin("content.manage");
  z.uuid().parse(id);
  const db = await createSessionClient();
  const { data: section } = await db.from("page_sections").select("kind").eq("id", id).single();
  if (!section) return { message: "המקטע לא נמצא" };
  const g = (k: string) => String(formData.get(k) ?? "").trim();
  const iso = (k: string) => (g(k) ? new Date(g(k)).toISOString() : null);
  let data: Record<string, unknown> = {};
  switch (section.kind) {
    case "hero":
      data = {
        eyebrow: g("eyebrow"), title: g("hero_title"), subtitle: g("subtitle"), image_url: g("image_url"), image_alt: g("image_alt"),
        primary: link.parse({ label: g("primary_label"), href: g("primary_href") }),
        secondary: link.parse({ label: g("secondary_label"), href: g("secondary_href") }),
      };
      if (!data.title) return { message: "נא להזין כותרת ראשית" };
      break;
    case "banner":
    case "text_image":
      data = {
        text: g("text"), image_url: g("image_url"), image_alt: g("image_alt"), image_side: g("image_side") === "end" ? "end" : "start",
        link: link.parse({ label: g("link_label"), href: g("link_href") }),
      };
      break;
    case "product_grid":
      data = {
        source: z.enum(["bestsellers", "newest", "sale", "featured"]).parse(g("source")),
        limit: Math.min(Math.max(Number(g("limit")) || 8, 1), 12),
        href: g("href"),
      };
      break;
    case "rooms":
      data = { items: lines(formData.get("items")).map((l) => { const [label, href] = l.split("|").map((x) => x.trim()); return { label, href: href || "/shop" }; }) };
      break;
    case "benefits":
      data = { items: lines(formData.get("items")).map((l) => { const [icon, title, text] = l.split("|").map((x) => x.trim()); return { icon, title, text }; }) };
      break;
    case "newsletter":
      data = { text: g("text") };
      break;
  }
  const { error } = await db
    .from("page_sections")
    .update({
      title: g("title") || null,
      data: data as never,
      is_active: formData.get("is_active") === "on",
      hide_on_mobile: formData.get("hide_on_mobile") === "on",
      starts_at: iso("starts_at"),
      ends_at: iso("ends_at"),
    })
    .eq("id", id);
  if (error) return { message: error.message };
  updateTag("content");
  redirect(`/admin/home/${id}?saved=${Date.now()}`);
}
