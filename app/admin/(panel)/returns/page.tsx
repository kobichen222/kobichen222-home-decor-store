import Link from "next/link";
import { AdminHeader, Badge, Card, Empty, TableWrap } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/features/orders/queries";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "החזרות והחזרים" };

export default async function ReturnsPage() {
  await requireAdmin("orders.view");
  const db = await createSessionClient();
  const { data: refunds } = await db
    .from("refunds")
    .select("id, amount, reason, status, created_at, order:orders(id, order_number, customer_name, total, status, payment_status)")
    .order("created_at", { ascending: false })
    .limit(200);
  const total = (refunds ?? []).reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <AdminHeader title="החזרות והחזרים כספיים" description="רישום החזר נעשה ממסך ההזמנה. ההחזר הכספי עצמו מבוצע במערכת חברת הסליקה." />
      <Card className="mb-5 flex flex-wrap gap-8 p-4 text-sm">
        <p>החזרים שנרשמו: <strong className="tabular-nums">{refunds?.length ?? 0}</strong></p>
        <p>סך הוחזר: <strong className="tabular-nums">{formatPrice(total)}</strong></p>
      </Card>
      {!refunds?.length ? (
        <Empty>
          עדיין לא נרשמו החזרים. כדי לרשום החזר, פתחו את ההזמנה ב
          <Link href="/admin/orders" className="font-semibold text-brand underline"> רשימת ההזמנות</Link>.
        </Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr><th>תאריך</th><th>הזמנה</th><th>לקוח</th><th>סכום</th><th>סיבה</th><th>מצב ההזמנה</th></tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr key={r.id}>
                <td className="text-ink-soft">{formatDate(r.created_at, true)}</td>
                <td><Link href={`/admin/orders/${r.order?.id}`} className="font-bold text-brand hover:underline">{r.order?.order_number}</Link></td>
                <td>{r.order?.customer_name}</td>
                <td className="font-semibold tabular-nums">{formatPrice(r.amount)} <span className="text-xs font-normal text-ink-soft">מתוך {formatPrice(r.order?.total ?? 0)}</span></td>
                <td className="text-ink-soft">{r.reason ?? "—"}</td>
                <td className="space-x-1 space-x-reverse">
                  <Badge tone={r.order?.status === "returned" ? "warning" : "neutral"}>{ORDER_STATUS_LABELS[r.order?.status ?? ""]}</Badge>
                  <Badge>{PAYMENT_STATUS_LABELS[r.order?.payment_status ?? ""]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
