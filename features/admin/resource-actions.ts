"use server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FieldDef } from "@/components/admin/resource-types";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { getResource } from "./resources";

export type ResourceFormState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

const empty = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => (empty(v) ? null : v), schema.nullable());

function fieldSchema(f: FieldDef): z.ZodType | null {
  const msg = `${f.label}: ערך לא תקין`;
  let s: z.ZodType;
  switch (f.kind) {
    case "readonly":
    case "products":
      return null;
    case "bool":
      return z.preprocess((v) => v === "on" || v === "true", z.boolean());
    case "number":
      s = z.coerce.number({ error: msg }).int(msg).min(0, msg).max(10_000_000, msg);
      break;
    case "money":
      s = z.coerce.number({ error: msg }).min(0, msg).max(10_000_000, msg);
      break;
    case "datetime":
      s = z.iso.datetime({ offset: true, error: msg });
      break;
    case "slug":
      s = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, `${f.label}: אותיות לטיניות קטנות, ספרות ומקפים בלבד`).max(120);
      break;
    case "code":
      s = z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/, `${f.label}: 3–32 אותיות לטיניות, ספרות, _ או -`);
      break;
    case "email":
      s = z.email(msg).max(254);
      break;
    case "image":
      s = z.string().trim().max(500).regex(/^(https:\/\/|http:\/\/127\.0\.0\.1|\/)/, `${f.label}: כתובת תמונה לא תקינה`);
      break;
    case "select": {
      s = f.options ? z.enum(f.options.map((o) => o.value) as [string, ...string[]], { error: msg }) : z.uuid(msg);
      break;
    }
    case "tags":
      return z.preprocess(
        (v) => (typeof v === "string" ? [...new Set(v.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, f.max ?? 20) : []),
        z.array(z.string().max(40)),
      );
    default:
      s = z.string().trim().max(f.max ?? (f.kind === "richtext" ? 50_000 : 2000), `${f.label}: ארוך מדי`);
  }
  if (f.required) return z.preprocess((v) => (empty(v) ? undefined : v), s.optional().refine((v) => v !== undefined, `נא למלא: ${f.label}`));
  return optional(s);
}

function dbMessage(error: { code?: string; message: string }): string {
  if (error.code === "23505") return "ערך כפול: קיימת כבר רשומה עם אותו קוד או כתובת";
  if (error.code === "23503") return "לא ניתן למחוק: הרשומה בשימוש במקום אחר";
  if (error.code === "23514") return "אחד הערכים אינו עומד בכללי המערכת (למשל אחוז מעל 100)";
  if (error.code === "42501") return "אין לך הרשאה לבצע פעולה זו";
  return `השמירה נכשלה: ${error.message}`;
}

export async function saveResource(key: string, id: string | null, _prev: ResourceFormState, formData: FormData): Promise<ResourceFormState> {
  const resource = getResource(key);
  if (!resource) return { message: "מסך לא קיים" };
  await requireAdmin(resource.permission);
  if (id !== null && !z.uuid().safeParse(id).success) return { message: "מזהה לא תקין" };
  if (id === null && !resource.canCreate) return { message: "לא ניתן ליצור רשומה חדשה במסך זה" };

  const db = (await createSessionClient()) as unknown as SupabaseClient;
  let existing: Record<string, unknown> | null = null;
  if (id) {
    const { data } = await db.from(resource.table).select("*").eq("id", id).maybeSingle();
    if (!data) return { message: "הרשומה לא נמצאה" };
    existing = data;
  }

  const row: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  for (const f of resource.fields) {
    if (f.lockWhen && existing?.[f.lockWhen]) continue;
    const schema = fieldSchema(f);
    if (!schema) continue;
    const parsed = schema.safeParse(formData.get(f.name));
    if (parsed.success) row[f.name] = parsed.data;
    else errors[f.name] = parsed.error.issues[0]?.message ?? "ערך לא תקין";
  }
  if (Object.keys(errors).length) return { errors, message: "נא לתקן את השדות המסומנים" };

  // Cross-field rules.
  if (row.starts_at && row.ends_at && String(row.ends_at) <= String(row.starts_at)) {
    return { errors: { ends_at: "הסיום חייב להיות אחרי ההתחלה" }, message: "נא לתקן את השדות המסומנים" };
  }
  if (row.kind === "percent" && Number(row.value) > 100) {
    return { errors: { value: "אחוז הנחה לא יכול לעלות על 100" }, message: "נא לתקן את השדות המסומנים" };
  }
  if (resource.table === "blog_posts" && row.status === "published" && !row.published_at) {
    row.published_at = (existing?.published_at as string | null) ?? new Date().toISOString();
  }

  let rowId = id;
  if (id) {
    const { error } = await db.from(resource.table).update(row).eq("id", id);
    if (error) return { message: dbMessage(error) };
  } else {
    const { data, error } = await db.from(resource.table).insert(row).select("id").single();
    if (error) return { message: dbMessage(error) };
    rowId = data.id as string;
  }

  const rel = resource.productRelation;
  if (rel && rowId) {
    const ids = z.array(z.uuid()).max(1000).safeParse(formData.getAll(rel.field));
    if (!ids.success) return { message: "רשימת מוצרים לא תקינה" };
    const { error: delError } = await db.from(rel.table).delete().eq(rel.fk, rowId);
    if (delError) return { message: dbMessage(delError) };
    if (ids.data.length) {
      const { error } = await db
        .from(rel.table)
        .insert(ids.data.map((product_id, i) => ({ [rel.fk]: rowId, product_id, sort_order: i })));
      if (error) return { message: dbMessage(error) };
    }
  }

  if (resource.tag) updateTag(resource.tag);
  redirect(`/admin/${resource.key}/${rowId}?saved=${Date.now()}`);
}

export async function deleteResource(formData: FormData): Promise<void> {
  const resource = getResource(String(formData.get("resource")));
  if (!resource?.canDelete) throw new Error("מחיקה אינה זמינה");
  await requireAdmin(resource.permission);
  const id = z.uuid().parse(formData.get("id"));
  const db = (await createSessionClient()) as unknown as SupabaseClient;
  if (resource.protectColumn) {
    const { data } = await db.from(resource.table).select(resource.protectColumn).eq("id", id).maybeSingle();
    if ((data as Record<string, unknown> | null)?.[resource.protectColumn]) {
      redirect(`/admin/${resource.key}/${id}?error=protected`);
    }
  }
  const { error } = await db.from(resource.table).delete().eq("id", id);
  if (error) redirect(`/admin/${resource.key}/${id}?error=${error.code === "23503" ? "in_use" : "failed"}`);
  if (resource.tag) updateTag(resource.tag);
  redirect(`/admin/${resource.key}?deleted=1`);
}
