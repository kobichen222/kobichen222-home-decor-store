import { AddUserForm, UserRolesForm } from "@/components/admin/settings-forms";
import { AdminHeader, Card, TableWrap } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "משתמשים והרשאות" };
type AdminUser = { user_id: string; email: string; last_sign_in_at: string | null; roles: { id: string }[] | null };

export default async function UsersPage() {
  const admin = await requireAdmin("users.manage");
  const db = await createSessionClient();
  const [{ data: users, error }, { data: roles }, { data: matrix }, { data: perms }] = await Promise.all([
    db.rpc("admin_list_users"),
    db.from("admin_roles").select("id, code, name, description").order("created_at"),
    db.from("admin_role_permissions").select("role_id, permission_code"),
    db.from("admin_permissions").select("code, description").order("code"),
  ]);
  if (error) throw new Error(error.message);
  const list = (users as unknown as AdminUser[]) ?? [];

  return (
    <>
      <AdminHeader title="משתמשים והרשאות" description="ההרשאות נאכפות בשרת ובבסיס הנתונים, לא רק בהסתרת כפתורים." />
      <Card className="mb-5 p-5">
        <h2 className="mb-3 font-bold">הוספת משתמש למערכת הניהול</h2>
        <AddUserForm roles={roles ?? []} />
      </Card>
      <div className="space-y-3">
        {list.map((u) => (
          <Card key={u.user_id} className="flex flex-wrap items-start justify-between gap-4 p-4">
            <div>
              <p className="font-semibold" dir="ltr">{u.email}</p>
              <p className="text-xs text-ink-soft">כניסה אחרונה: {u.last_sign_in_at ? formatDate(u.last_sign_in_at, true) : "טרם התחבר"}{u.user_id === admin.userId && " · זה את/ה"}</p>
            </div>
            <div className="min-w-0 flex-1 sm:max-w-2xl">
              <UserRolesForm userId={u.user_id} roles={roles ?? []} current={(u.roles ?? []).map((r) => r.id)} self={u.user_id === admin.userId} />
            </div>
          </Card>
        ))}
      </div>
      <h2 className="mb-3 mt-8 font-bold">מה כל תפקיד רשאי לעשות</h2>
      <TableWrap>
        <thead>
          <tr>
            <th>הרשאה</th>
            {(roles ?? []).map((r) => <th key={r.id} className="whitespace-nowrap">{r.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {(perms ?? []).map((p) => (
            <tr key={p.code}>
              <td>{p.description}</td>
              {(roles ?? []).map((r) => (
                <td key={r.id} className="text-center">
                  {r.code === "owner" || matrix?.some((m) => m.role_id === r.id && m.permission_code === p.code) ? <span className="text-success" aria-label="כן">●</span> : <span className="text-line" aria-label="לא">○</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
