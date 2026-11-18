"use server";
import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { storeInfo } from "@/lib/email/notify";
import { adminLead } from "@/lib/email/templates";
import { getCustomer } from "@/lib/auth/customer";
import { allow, clientIp } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

export type FormResult = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;
const issues = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));
const PHOTO_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const projectSchema = z.object({
  full_name: z.string().trim().min(2, "נא להזין שם").max(80),
  phone: z.string().trim().transform((v) => v.replace(/[\s-]/g, "")).pipe(z.string().regex(/^0\d{8,9}$/, "מספר הטלפון אינו תקין")),
  email: z.preprocess((v) => (v === "" ? null : v), z.email("כתובת הדוא״ל אינה תקינה").nullable()),
  company: z.string().trim().max(120).optional(),
  business_type: z.string().trim().min(2, "נא לציין את סוג העסק").max(80),
  space_size: z.string().trim().max(40).optional(),
  budget: z.string().trim().max(40).optional(),
  target_date: z.string().trim().max(20).optional(),
  products: z.string().trim().max(1500).optional(),
  message: z.string().trim().max(3000).optional(),
});

// Business project request → lead (with up to 3 photos of the space,
// stored in the private bucket; only the admin can view them).
export async function submitBusinessProject(_prev: FormResult, formData: FormData): Promise<FormResult> {
  if (formData.get("website")) return { ok: true };
  const parsed = projectSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { errors: issues(parsed.error), message: "נא לתקן את השדות המסומנים" };
  if (!(await allow("business-project", await clientIp(), 5, 3600))) return { message: "נשלחו יותר מדי פניות. נסו שוב מאוחר יותר." };
  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
  for (const f of files) {
    if (!PHOTO_TYPES[f.type]) return { message: `${f.name}: יש לצרף תמונות JPG, PNG או WebP` };
    if (f.size > 5 * 1024 * 1024) return { message: `${f.name}: גדול מ־5MB` };
  }
  const db = createServiceClient();
  const leadId = randomUUID();
  const photos: string[] = [];
  for (const f of files) {
    const path = `leads/${leadId}/${randomUUID()}.${PHOTO_TYPES[f.type]}`;
    const { error } = await db.storage.from("private").upload(path, f, { contentType: f.type });
    if (!error) photos.push(path);
  }
  const { full_name, phone, email, message, ...data } = parsed.data;
  const summary = [
    `סוג העסק: ${data.business_type}`,
    data.company && `חברה: ${data.company}`,
    data.space_size && `גודל החלל: ${data.space_size}`,
    data.budget && `תקציב: ${data.budget}`,
    data.target_date && `תאריך יעד: ${data.target_date}`,
    data.products && `מוצרים מבוקשים: ${data.products}`,
    message,
  ].filter(Boolean).join("\n");
  const { error } = await db.from("leads").insert({ id: leadId, kind: "business_project", full_name, phone, email, message: summary, data: { ...data, photos } });
  if (error) return { message: "השליחה נכשלה. נסו שוב או התקשרו אלינו." };
  after(async () => {
    const store = await storeInfo();
    if (store.email) await sendEmail({ to: store.email, tag: "admin_lead", ...adminLead(store.name, { full_name, phone, email, message: summary, id: leadId }) });
  });
  return { ok: true };
}

export async function requestBusinessAccount(_prev: FormResult, formData: FormData): Promise<FormResult> {
  const customer = await getCustomer();
  if (!customer) return { message: "יש להתחבר" };
  const parsed = z
    .object({
      company_name: z.string().trim().min(2, "נא להזין שם חברה").max(120),
      company_number: z.string().trim().regex(/^\d{8,9}$/, "ח.פ. / עוסק מורשה: 8–9 ספרות"),
      phone: z.string().trim().max(20).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: issues(parsed.error), message: "נא לתקן את השדות המסומנים" };
  const db = createServiceClient();
  const { data: existing } = await db.from("business_accounts").select("id, status").eq("user_id", customer.id).maybeSingle();
  if (existing) return { message: existing.status === "approved" ? "החשבון העסקי כבר מאושר" : "הבקשה כבר התקבלה וממתינה לאישור" };
  const { error } = await db.from("business_accounts").insert({ user_id: customer.id, ...parsed.data, status: "pending" });
  if (error) return { message: "השליחה נכשלה" };
  await db.from("profiles").update({ customer_type: "business" }).eq("id", customer.id);
  revalidatePath("/account/profile");
  return { ok: true, message: "הבקשה נשלחה. נעדכן אתכם לאחר האישור." };
}
