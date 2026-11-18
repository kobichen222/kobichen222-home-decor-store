import Form from "next/form";
import Link from "next/link";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "לקוחות" };
const SEGMENTS = [
  ["all", "כל הלקוחות"],
  ["new", "חדשים (30 יום)"],
  ["returning", "חוזרים (2+ הזמנות)"],
  ["business", "עסקיים"],
  ["high_value", "רכישות גבוהות (2,000 ₪+)"],
  ["dormant", "לא רכשו חצי שנה"],
  ["no_orders", "ללא רכישה"],
] as const;
const PER_PAGE = 50;

type CustomerRow = {
  email: string; name: string | null; phone: string | null; is_business: boolean | null; orders: number;
  total_spent: number; last_order_at: string | null; user_id: string | null; subscribed: boolean;
};

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requireAdmin("customers.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const segment = SEGMENTS.find(([v]) => v === sp.segment)?.[0] ?? "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await createSessionClient();
  const { data, error } = await db.rpc("admin_customers", { p_q: q, p_segment: segment, p_limit: PER_PAGE, p_offset: (page - 1) * PER_PAGE });
  if (error) throw new Error(error.message);
  const { items, total } = data as unknown as { items: CustomerRow[]; total: number };

  return (
    <>
      <AdminHeader title="לקוחות" description={`${total} לקוחות · כולל רוכשים ללא הרשמה, לפי כתובת דוא״ל`} />
      <Form action="/admin/customers" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="שם, דוא״ל או טלפון" aria-label="חיפוש לקוחות" className="max-w-xs" />
        <Select name="segment" defaultValue={segment} aria-label="פלח" className="w-56">
          {SEGMENTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
        <Button type="submit" variant="outline">סינון</Button>
      </Form>
      {!items.length ? (
        <Empty>לא נמצאו לקוחות</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>לקוח</th>
              <th>טלפון</th>
              <th>הזמנות</th>
              <th>סך רכישות</th>
              <th>הזמנה אחרונה</th>
              <th>סוג</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.email} className="relative hover:bg-sand/40">
                <td>
                  <Link href={`/admin/customers/${encodeURIComponent(c.email)}`} className="font-semibold hover:text-brand after:absolute after:inset-0">
                    {c.name ?? "—"}
                  </Link>
                  <div className="text-xs text-ink-soft" dir="ltr">{c.email}</div>
                </td>
                <td dir="ltr" className="text-end text-ink-soft">{c.phone ?? "—"}</td>
                <td className="tabular-nums">{c.orders}</td>
                <td className="font-semibold tabular-nums">{formatPrice(c.total_spent)}</td>
                <td className="text-ink-soft">{c.last_order_at ? formatDate(c.last_order_at) : "—"}</td>
                <td className="space-x-1 space-x-reverse">
                  {c.is_business && <Badge tone="info">עסקי</Badge>}
                  {c.user_id ? <Badge tone="success">רשום</Badge> : <Badge>אורח</Badge>}
                  {c.subscribed && <Badge tone="warning">דיוור</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {total > PER_PAGE && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="עמודים">
          {page > 1 && <Link href={{ pathname: "/admin/customers", query: { q, segment, page: page - 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">הקודם</Link>}
          {page * PER_PAGE < total && <Link href={{ pathname: "/admin/customers", query: { q, segment, page: page + 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">הבא</Link>}
        </nav>
      )}
    </>
  );
}
