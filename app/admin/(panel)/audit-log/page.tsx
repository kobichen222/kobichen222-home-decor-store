import Form from "next/form";
import Link from "next/link";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "יומן פעילות" };
const ENTITY: Record<string, string> = {
  products: "מוצרים", product_variants: "וריאציות", categories: "קטגוריות", collections: "קולקציות", brands: "מותגים",
  orders: "הזמנות", refunds: "החזרים", coupons: "קופונים", promotions: "מבצעים", shipping_methods: "משלוחים",
  store_settings: "הגדרות", pages: "עמודים", page_sections: "עמוד הבית", banners: "באנרים", blog_posts: "בלוג",
  admin_user_roles: "הרשאות", business_quotes: "הצעות מחיר", inventory_movements: "התאמות מלאי",
};
const ACTION: Record<string, [string, "success" | "warning" | "danger"]> = { insert: ["יצירה", "success"], update: ["עדכון", "warning"], delete: ["מחיקה", "danger"] };
const PER_PAGE = 50;
type Entry = { id: number; created_at: string; action: string; entity: string; entity_id: string | null; changes: Record<string, unknown> | null; actor_email: string | null };

function summary(e: Entry): string {
  if (!e.changes) return "";
  if (e.action !== "update") {
    const c = e.changes as Record<string, unknown>;
    return String(c.name ?? c.title ?? c.code ?? c.key ?? c.sku ?? "");
  }
  return Object.entries(e.changes)
    .slice(0, 4)
    .map(([k, v]) => {
      const { from, to } = (v ?? {}) as { from?: unknown; to?: unknown };
      const short = (x: unknown) => (x == null ? "∅" : typeof x === "object" ? "…" : String(x).slice(0, 40));
      return `${k}: ${short(from)} ← ${short(to)}`;
    })
    .join(" · ");
}

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  await requireAdmin("settings.manage", "users.manage");
  const sp = await searchParams;
  const entity = typeof sp.entity === "string" && /^[a-z_]+$/.test(sp.entity) ? sp.entity : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await createSessionClient();
  const { data, error } = await db.rpc("admin_audit_log", { p_entity: entity ?? undefined, p_limit: PER_PAGE, p_offset: (page - 1) * PER_PAGE });
  if (error) throw new Error(error.message);
  const { items, total, entities } = data as unknown as { items: Entry[]; total: number; entities: string[] };
  const link = (e: Entry) =>
    e.action === "delete" || !e.entity_id ? null
      : e.entity === "products" ? `/admin/products/${e.entity_id}`
      : e.entity === "orders" ? `/admin/orders/${e.entity_id}`
      : e.entity === "categories" ? `/admin/categories/${e.entity_id}`
      : null;

  return (
    <>
      <AdminHeader title="יומן פעילות" description="כל שינוי מהותי נרשם עם המשתמש שביצע אותו. שינויים שנעשו אוטומטית (תשלום, מערכת) מסומנים ״מערכת״." />
      <Form action="/admin/audit-log" className="mb-4 flex gap-2">
        <Select name="entity" defaultValue={entity ?? ""} aria-label="סוג רשומה" className="w-56">
          <option value="">כל הרשומות</option>
          {entities.map((x) => <option key={x} value={x}>{ENTITY[x] ?? x}</option>)}
        </Select>
        <Button type="submit" variant="outline">סינון</Button>
      </Form>
      {!items.length ? (
        <Empty>אין פעילות להצגה</Empty>
      ) : (
        <TableWrap>
          <thead><tr><th>זמן</th><th>משתמש</th><th>פעולה</th><th>רשומה</th><th>פירוט</th></tr></thead>
          <tbody>
            {items.map((e) => {
              const href = link(e);
              return (
                <tr key={e.id}>
                  <td className="whitespace-nowrap text-ink-soft">{formatDate(e.created_at, true)}</td>
                  <td dir="ltr" className="text-end">{e.actor_email ?? <span className="text-ink-soft">מערכת</span>}</td>
                  <td><Badge tone={ACTION[e.action]?.[1]}>{ACTION[e.action]?.[0] ?? e.action}</Badge></td>
                  <td>{href ? <Link href={href} className="font-semibold hover:text-brand">{ENTITY[e.entity] ?? e.entity}</Link> : ENTITY[e.entity] ?? e.entity}</td>
                  <td className="max-w-md truncate text-xs text-ink-soft" title={summary(e)}>{summary(e)}</td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      {total > PER_PAGE && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="עמודים">
          {page > 1 && <Link href={{ pathname: "/admin/audit-log", query: { ...(entity && { entity }), page: page - 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">הקודם</Link>}
          {page * PER_PAGE < total && <Link href={{ pathname: "/admin/audit-log", query: { ...(entity && { entity }), page: page + 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">הבא</Link>}
        </nav>
      )}
    </>
  );
}
