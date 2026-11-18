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

// getClaims() verifies the session token's signature (locally, with the
// project's published signing keys; never trusting the cookie alone). The
// permissions come from the database for that user. Both run once per
// request thanks to cache().
export const getAdmin = cache(async (): Promise<AdminSession | null> => {
  return (await adminState()).admin;
});

/**
 * Who is signed in to the admin and whether they still owe the second
 * factor. With 2FA enrolled, the database grants nothing until the
 * session reached aal2, so permissions come back empty.
 */
export const adminState = cache(async (): Promise<{ admin: AdminSession | null; needsMfa: boolean }> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return { admin: null, needsMfa: false };
  const { data: permissions } = await supabase.rpc("my_permissions");
  if (permissions?.length) {
    return { admin: { userId: claims.sub, email: (claims.email as string | undefined) ?? "", permissions: permissions as Permission[] }, needsMfa: false };
  }
  if (claims.aal !== "aal2") {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2") {
      const { data: member } = await supabase.rpc("is_admin_member");
      return { admin: null, needsMfa: !!member };
    }
  }
  return { admin: null, needsMfa: false };
});

/** Gate for every admin page and every admin Server Action. */
export async function requireAdmin(...anyOf: Permission[]): Promise<AdminSession> {
  const { admin, needsMfa } = await adminState();
  if (needsMfa) redirect("/admin/mfa");
  if (!admin) redirect("/admin/login");
  if (anyOf.length && !anyOf.some((p) => admin.permissions.includes(p))) redirect("/admin?denied=1");
  return admin;
}

export function can(admin: AdminSession, ...anyOf: Permission[]): boolean {
  return anyOf.some((p) => admin.permissions.includes(p));
}
