import { AdminHeader, Badge, Card, Empty, TableWrap } from "@/components/admin/ui";
import { ORDER_STATUS_LABELS } from "@/features/orders/queries";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "סלים נטושים" };

type Cart = { id: string; email: string | null; customer_name: string | null; updated_at: string; units: number; value: number; products: string; coupon_code: string | null; last_order_status: string | null };

export default async function AbandonedCartsPage() {
  await requireAdmin("marketing.manage");
  const db = await createSessionClient();
  const { data, error } = await db.rpc("admin_abandoned_carts", { p_hours: 1 });
  if (error) throw new Error(error.message);
  const carts = (data as unknown as Cart[]) ?? [];
  const withEmail = carts.filter((c) => c.email);
  const value = carts.reduce((s, c) => s + Number(c.value), 0);

  return (
    <>
      <AdminHeader title="סלים נטושים" description="סלים עם מוצרים שלא הושלמה בהם רכישה במשך שעה לפחות." />
      <dl className="mb-5 grid grid-cols-3 gap-3">
        {[
          ["סלים נטושים", carts.length],
          ["עם כתובת דוא״ל", withEmail.length],
          ["שווי כולל", formatPrice(value)],
        ].map(([l, v]) => (
          <Card key={String(l)} className="p-4">
            <dt className="text-xs font-semibold text-ink-soft">{l}</dt>
            <dd className="mt-1.5 text-xl font-bold tabular-nums">{v}</dd>
          </Card>
        ))}
      </dl>
      <p className="mb-4 rounded-xl bg-white p-3 text-sm text-ink-soft">
        כתובת דוא״ל ידועה רק כשהלקוח הגיע לשלב התשלום. שליחת תזכורת אוטומטית, בהתאם להסכמת הלקוח לדיוור, תתווסף עם חיבור ספק הדוא״ל.
      </p>
      {!carts.length ? (
        <Empty>אין כרגע סלים נטושים</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr><th>עדכון אחרון</th><th>לקוח</th><th>מוצרים</th><th>יחידות</th><th>שווי</th><th>ניסיון תשלום</th></tr>
          </thead>
          <tbody>
            {carts.map((c) => (
              <tr key={c.id}>
                <td className="text-ink-soft">{formatDate(c.updated_at, true)}</td>
                <td>
                  {c.customer_name ?? "אנונימי"}
                  {c.email && <div className="text-xs text-ink-soft" dir="ltr">{c.email}</div>}
                </td>
                <td className="max-w-xs truncate" title={c.products}>{c.products}</td>
                <td className="tabular-nums">{c.units}</td>
                <td className="font-semibold tabular-nums">{formatPrice(c.value)}</td>
                <td>{c.last_order_status ? <Badge tone="warning">{ORDER_STATUS_LABELS[c.last_order_status]}</Badge> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
