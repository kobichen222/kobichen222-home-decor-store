import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/server";

export type Permission =
  | "catalog.manage"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "shipping.manage"
  | "customers.view"
  | "customers.manage"
  | "content.manage"
  | "marketing.manage"
  | "reports.view"
  | "finance.view"
  | "settings.manage"
  | "users.manage";

export type AdminSession = { userId: string; email: string; permissions: Permission[] };

// getUser() validates the token with the auth server (never trust the
// cookie alone); permissions come from the database for that user.
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: permissions } = await supabase.rpc("my_permissions");
  if (!permissions?.length) return null;
  return { userId: user.id, email: user.email ?? "", permissions: permissions as Permission[] };
});

/** Gate for every admin page and every admin Server Action. */
export async function requireAdmin(...anyOf: Permission[]): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (anyOf.length && !anyOf.some((p) => admin.permissions.includes(p))) redirect("/admin?denied=1");
  return admin;
}

export function can(admin: AdminSession, ...anyOf: Permission[]): boolean {
  return anyOf.some((p) => admin.permissions.includes(p));
}
