import Form from "next/form";
import Link from "next/link";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "הזמנות" };
const PER_PAGE = 30;
type OrderStatus = Database["public"]["Enums"]["order_status"];

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin("orders.view");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status = typeof sp.status === "string" && sp.status in ORDER_STATUS_LABELS ? (sp.status as OrderStatus) : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const db = await createSessionClient();
  let query = db
    .from("orders")
    .select("id, order_number, placed_at, customer_name, customer_email, total, status, payment_status, shipping_method_name, tracking_number, items:order_items(quantity)", { count: "exact" })
    .order("placed_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (status) query = query.eq("status", status);
  if (q) {
    const safe = q.replace(/[%_\\,()]/g, "");
    query = /^\d+$/.test(safe) ? query.eq("order_number", Number(safe)) : query.or(`customer_name.ilike.%${safe}%,customer_email.ilike.%${safe}%`);
  }
  const { data: orders, count, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <>
      <AdminHeader title="הזמנות" description={`${count ?? 0} הזמנות`} />
      <Form action="/admin/orders" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="מספר הזמנה, שם או דוא״ל" aria-label="חיפוש הזמנות" className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ""} aria-label="סטטוס" className="w-44">
          <option value="">כל הסטטוסים</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline">
          סינון
        </Button>
      </Form>
      {!orders?.length ? (
        <Empty>לא נמצאו הזמנות</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>מספר</th>
              <th>תאריך</th>
              <th>לקוח</th>
              <th>פריטים</th>
              <th>סכום</th>
              <th>תשלום</th>
              <th>סטטוס טיפול</th>
              <th>אספקה</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-bold text-brand hover:underline">
                    {o.order_number}
                  </Link>
                </td>
                <td className="text-ink-soft">{formatDate(o.placed_at, true)}</td>
                <td>
                  {o.customer_name}
                  <div className="text-xs text-ink-soft" dir="ltr">
                    {o.customer_email}
                  </div>
                </td>
                <td className="tabular-nums">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="font-semibold tabular-nums">{formatPrice(o.total)}</td>
                <td>
                  <Badge tone={o.payment_status === "paid" ? "success" : o.payment_status === "failed" ? "danger" : "neutral"}>{PAYMENT_STATUS_LABELS[o.payment_status]}</Badge>
                </td>
                <td>
                  <Badge tone={o.status === "cancelled" || o.status === "returned" ? "danger" : o.status === "paid" ? "info" : o.status === "delivered" ? "success" : "neutral"}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                </td>
                <td className="text-ink-soft">
                  {o.shipping_method_name}
                  {o.tracking_number && <div className="text-xs">{o.tracking_number}</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
      {(count ?? 0) > PER_PAGE && (
        <nav className="mt-4 flex justify-center gap-2" aria-label="עמודים">
          {page > 1 && (
            <Link href={{ pathname: "/admin/orders", query: { ...(q && { q }), ...(status && { status }), page: page - 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">
              הקודם
            </Link>
          )}
          {page * PER_PAGE < (count ?? 0) && (
            <Link href={{ pathname: "/admin/orders", query: { ...(q && { q }), ...(status && { status }), page: page + 1 } }} className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white">
              הבא
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
