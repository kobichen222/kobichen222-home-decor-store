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
