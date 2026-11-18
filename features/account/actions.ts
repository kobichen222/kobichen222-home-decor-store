"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCustomer } from "@/lib/auth/customer";
import { allow, clientIp } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { safeInternalPath } from "@/lib/utils";
import { after } from "next/server";
import { sendEmail } from "@/lib/email";
import { storeInfo } from "@/lib/email/notify";
import { welcome } from "@/lib/email/templates";

export type AccountState = { ok?: boolean; message?: string; errors?: Record<string, string> } | null;

const phone = z.string().trim().transform((v) => v.replace(/[\s-]/g, "")).pipe(z.string().regex(/^0\d{8,9}$/, "מספר הטלפון אינו תקין"));
const issues = (e: z.ZodError) => Object.fromEntries(e.issues.map((i) => [String(i.path[0]), i.message]));

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "נא להזין שם מלא").max(80),
  email: z.email("כתובת הדוא״ל אינה תקינה").max(254),
  phone,
  password: z.string().min(8, "סיסמה של 8 תווים לפחות").max(72),
  marketing: z.boolean(),
  terms: z.literal(true, "יש לאשר את התקנון ומדיניות הפרטיות"),
});

export async function register(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: formData.get("phone"),
    password: formData.get("password"),
    marketing: formData.get("marketing") === "on",
    terms: formData.get("terms") === "on",
  });
  if (!parsed.success) return { errors: issues(parsed.error), message: "נא לתקן את השדות המסומנים" };
  if (!(await allow("register", await clientIp(), 5, 3600))) return { message: "יותר מדי ניסיונות. נסו שוב בעוד שעה." };
  const v = parsed.data;

  // Accounts are created server-side and confirmed immediately, because
  // e-mail delivery is not connected yet. Orders are linked to an account
  // only when placed while signed in — never by matching an e-mail address.
  const service = createServiceClient();
  const { data, error } = await service.auth.admin.createUser({
    email: v.email,
    password: v.password,
    email_confirm: true,
    user_metadata: { full_name: v.full_name },
  });
  if (error || !data.user) {
    const exists = /already|registered|exists/i.test(error?.message ?? "");
    return { message: exists ? "כתובת הדוא״ל כבר רשומה. אפשר להתחבר." : "ההרשמה נכשלה. נסו שוב." };
  }
  await service
    .from("profiles")
    .update({ full_name: v.full_name, phone: v.phone, marketing_opt_in: v.marketing, marketing_opt_in_at: v.marketing ? new Date().toISOString() : null })
    .eq("id", data.user.id);
  if (v.marketing) {
    await service.from("newsletter_subscribers").upsert({ email: v.email, source: "register", unsubscribed_at: null, consent_at: new Date().toISOString() }, { onConflict: "email" });
  }
  await service.from("wishlists").insert({ user_id: data.user.id });
  after(async () => {
    const store = await storeInfo();
    await sendEmail({ to: v.email, tag: "welcome", ...welcome(store.name, v.full_name) });
  });

  const supabase = await createSessionClient();
  await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
  redirect(safeInternalPath(String(formData.get("next") ?? ""), "/account"));
}

export async function login(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = z.object({ email: z.email(), password: z.string().min(1).max(200) }).safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
  });
  const generic = { message: "דוא״ל או סיסמה שגויים" };
  if (!parsed.success) return generic;
  const ip = await clientIp();
  if (!(await allow("login-ip", ip, 20, 900)) || !(await allow("login-email", parsed.data.email, 8, 900))) {
    return { message: "יותר מדי ניסיונות התחברות. נסו שוב בעוד 15 דקות." };
  }
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return generic;
  redirect(safeInternalPath(String(formData.get("next") ?? ""), "/account"));
}

export async function logout(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function updateProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const parsed = z
    .object({ full_name: z.string().trim().min(2, "נא להזין שם").max(80), phone, marketing: z.boolean() })
    .safeParse({ full_name: formData.get("full_name"), phone: formData.get("phone"), marketing: formData.get("marketing") === "on" });
  if (!parsed.success) return { errors: issues(parsed.error), message: "נא לתקן את השדות המסומנים" };
  const supabase = await createSessionClient();
  const { data: before } = await supabase.from("profiles").select("marketing_opt_in").eq("id", customer.id).single();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      marketing_opt_in: parsed.data.marketing,
      ...(parsed.data.marketing !== before?.marketing_opt_in && { marketing_opt_in_at: parsed.data.marketing ? new Date().toISOString() : null }),
    })
    .eq("id", customer.id);
  if (error) return { message: "השמירה נכשלה" };
  const service = createServiceClient();
  if (parsed.data.marketing) {
    await service.from("newsletter_subscribers").upsert({ email: customer.email, source: "account", unsubscribed_at: null, consent_at: new Date().toISOString() }, { onConflict: "email" });
  } else {
    await service.from("newsletter_subscribers").update({ unsubscribed_at: new Date().toISOString() }).eq("email", customer.email);
  }
  return { ok: true, message: "הפרטים נשמרו" };
}

export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const parsed = z.string().min(8, "סיסמה של 8 תווים לפחות").max(72).safeParse(formData.get("password"));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  return error ? { message: "עדכון הסיסמה נכשל" } : { ok: true, message: "הסיסמה עודכנה" };
}

const addressSchema = z.object({
  label: z.string().trim().max(40).optional(),
  full_name: z.string().trim().min(2, "נא להזין שם").max(80),
  phone,
  city: z.string().trim().min(2, "נא להזין עיר").max(60),
  street: z.string().trim().min(2, "נא להזין רחוב").max(80),
  house_number: z.string().trim().min(1, "נא להזין מספר בית").max(10),
  apartment: z.string().trim().max(10).optional(),
  zip: z.union([z.literal(""), z.string().trim().regex(/^\d{5,7}$/, "מיקוד: 5–7 ספרות")]).optional(),
  is_default: z.boolean(),
});

export async function saveAddress(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const parsed = addressSchema.safeParse({ ...Object.fromEntries(formData), is_default: formData.get("is_default") === "on" });
  if (!parsed.success) return { errors: issues(parsed.error), message: "נא לתקן את השדות המסומנים" };
  const supabase = await createSessionClient();
  const { count } = await supabase.from("customer_addresses").select("id", { count: "exact", head: true }).eq("user_id", customer.id);
  if ((count ?? 0) >= 10) return { message: "ניתן לשמור עד 10 כתובות" };
  const isDefault = parsed.data.is_default || count === 0;
  if (isDefault) await supabase.from("customer_addresses").update({ is_default: false }).eq("user_id", customer.id);
  const { error } = await supabase.from("customer_addresses").insert({ ...parsed.data, zip: parsed.data.zip || null, is_default: isDefault, user_id: customer.id });
  if (error) return { message: "השמירה נכשלה" };
  revalidatePath("/account/addresses");
  return { ok: true, message: "הכתובת נשמרה" };
}

export async function deleteAddress(formData: FormData): Promise<void> {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login");
  const supabase = await createSessionClient();
  await supabase.from("customer_addresses").delete().eq("id", z.uuid().parse(formData.get("id"))).eq("user_id", customer.id);
  revalidatePath("/account/addresses");
}

// ---------- Wishlist -------------------------------------------------------
async function wishlistId(userId: string): Promise<string> {
  const supabase = await createSessionClient();
  const { data } = await supabase.from("wishlists").select("id").eq("user_id", userId).order("created_at").limit(1);
  if (data?.[0]) return data[0].id;
  const { data: created, error } = await supabase.from("wishlists").insert({ user_id: userId }).select("id").single();
  if (error || !created) throw new Error("wishlist create failed");
  return created.id;
}

/** Product ids in the shopper's wishlist; null when signed out. */
export async function getWishlistIds(): Promise<string[] | null> {
  const customer = await getCustomer();
  if (!customer) return null;
  const supabase = await createSessionClient();
  const { data } = await supabase.from("wishlist_items").select("product_id, wishlist:wishlists!inner(user_id)").eq("wishlist.user_id", customer.id);
  return (data ?? []).map((r) => r.product_id);
}

export async function toggleWishlist(productId: string): Promise<{ signedIn: boolean; saved?: boolean }> {
  const customer = await getCustomer();
  if (!customer) return { signedIn: false };
  const id = z.uuid().parse(productId);
  const supabase = await createSessionClient();
  const list = await wishlistId(customer.id);
  const { data: existing } = await supabase.from("wishlist_items").select("product_id").eq("wishlist_id", list).eq("product_id", id).maybeSingle();
  if (existing) {
    await supabase.from("wishlist_items").delete().eq("wishlist_id", list).eq("product_id", id);
    return { signedIn: true, saved: false };
  }
  await supabase.from("wishlist_items").insert({ wishlist_id: list, product_id: id });
  return { signedIn: true, saved: true };
}
