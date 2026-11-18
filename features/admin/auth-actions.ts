"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { allow, clientIp } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email(), password: z.string().min(6).max(200) });

export async function signIn(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  // One generic message for every failure: do not reveal which part was wrong.
  const generic = { error: "פרטי ההתחברות שגויים" };
  if (!parsed.success) return generic;
  if (!(await allow("admin-login-ip", await clientIp(), 10, 900)) || !(await allow("admin-login-email", parsed.data.email.toLowerCase(), 5, 900))) {
    return { error: "יותר מדי ניסיונות. נסו שוב בעוד 15 דקות." };
  }
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return generic;
  const { data: member } = await supabase.rpc("is_admin_member");
  if (!member) {
    await supabase.auth.signOut();
    return generic;
  }
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  redirect(aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" ? "/admin/mfa" : "/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
