"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSessionClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email(), password: z.string().min(6).max(200) });

export async function signIn(_prev: { error?: string } | null, formData: FormData): Promise<{ error?: string }> {
  const parsed = schema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  // One generic message for every failure: do not reveal which part was wrong.
  const generic = { error: "פרטי ההתחברות שגויים" };
  if (!parsed.success) return generic;
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return generic;
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return generic;
  }
  redirect("/admin");
}

export async function signOut(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
