"use server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";

const schema = z.object({ email: z.email().max(254), consent: z.literal("on") });

// Marketing consent is explicit (unticked checkbox) and timestamped, as
// required for commercial mailing lists.
export async function subscribeNewsletter(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  const parsed = schema.safeParse({ email: formData.get("email"), consent: formData.get("consent") });
  if (!parsed.success) return { ok: false, error: "נא להזין כתובת דוא״ל תקינה ולאשר קבלת דיוור" };
  const { error } = await createServiceClient()
    .from("newsletter_subscribers")
    .upsert(
      { email: parsed.data.email.toLowerCase(), source: "home", unsubscribed_at: null, consent_at: new Date().toISOString() },
      { onConflict: "email" },
    );
  return error ? { ok: false, error: "לא הצלחנו לרשום אתכם. נסו שוב." } : { ok: true };
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "נא להזין שם").max(80),
  phone: z.string().trim().transform((v) => v.replace(/[\s-]/g, "")).pipe(z.string().regex(/^0\d{8,9}$/, "מספר הטלפון אינו תקין")),
  email: z.preprocess((v) => (v === "" ? null : v), z.email("כתובת הדוא״ל אינה תקינה").max(254).nullable()),
  kind: z.enum(["contact", "quote", "business_project"]),
  message: z.string().trim().max(2000),
});

export async function submitContact(_prev: { ok: boolean; error?: string } | null, formData: FormData) {
  if (formData.get("website")) return { ok: true }; // bot filled the honeypot
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { name, ...rest } = parsed.data;
  const { error } = await createServiceClient().from("leads").insert({ full_name: name, ...rest });
  return error ? { ok: false, error: "השליחה נכשלה. נסו שוב או התקשרו אלינו." } : { ok: true };
}
