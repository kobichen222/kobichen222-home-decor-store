import Link from "next/link";
import { DailyBars, HBars } from "@/components/admin/charts";
import { RangePicker } from "@/components/admin/range-picker";
import { AdminHeader, Card, TableWrap } from "@/components/admin/ui";
import { parseRange } from "@/features/admin/report-range";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "דוחות מכירה" };

type Sales = {
  gross: number; refunds: number; net: number; orders: number; aov: number; units: number; discounts: number; shipping: number; vat: number;
  new_customers: number; returning_customers: number; cancelled: number;
  by_day: { day: string; revenue: number; orders: number }[];
  by_category: { name: string; revenue: number; units: number }[];
  top_products: { product_id: string; name: string; units: number; revenue: number }[];
  top_customers: { email: string; name: string; orders: number; total: number }[];
  coupons: { code: string; orders: number; revenue: number }[];
  promotions: { name: string; orders: number; revenue: number }[];
};

export default async function SalesReportPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin("reports.view", "finance.view");
  const range = parseRange(await searchParams);
  const db = await createSessionClient();
  const { data, error } = await db.rpc("report_sales", { p_from: range.from, p_to: range.to });
  if (error) throw new Error(error.message);
  const r = data as unknown as Sales;
  const cards: [string, string | number, string?][] = [
    ["מכירות (ברוטו)", formatPrice(r.gross)],
    ["החזרים", formatPrice(r.refunds)],
    ["נטו", formatPrice(r.net), "ברוטו פחות החזרים"],
    ["הזמנות", r.orders],
    ["ממוצע הזמנה", formatPrice(r.aov)],
    ["יחידות שנמכרו", r.units],
    ["לקוחות חדשים", r.new_customers],
    ["לקוחות חוזרים", r.returning_customers],
  ];

  return (
    <>
      <AdminHeader title="דוחות מכירה" description={`${formatDate(range.from)} – ${formatDate(range.to)} · לפי מועד התשלום, שעון ישראל. הסכומים כוללים מע״מ ומשלוח.`}>
        <Link href={`/admin/reports/products?from=${range.from}&to=${range.to}`} className="text-sm font-semibold text-brand hover:underline">לדוח מוצרים ←</Link>
      </AdminHeader>
      <RangePicker path="/admin/reports" range={range} />
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map(([l, v, hint]) => (
          <Card key={l} className="p-4">
            <dt className="text-xs font-semibold text-ink-soft">{l}</dt>
            <dd className="mt-1.5 text-xl font-bold tabular-nums">{v}</dd>
            {hint && <dd className="text-xs text-ink-soft">{hint}</dd>}
          </Card>
        ))}
      </dl>

      <Card className="mt-5 p-5">
        <h2 className="font-bold">מכירות לפי יום</h2>
        <DailyBars data={r.by_day} label={`מכירות יומיות ${range.from} עד ${range.to}`} />
        <details className="mt-3 text-sm">
          <summary className="font-semibold text-ink-soft">הצגה כטבלה</summary>
          <table className="mt-2 w-full max-w-md text-sm">
            <thead><tr className="text-start text-xs text-ink-soft"><th className="text-start">תאריך</th><th className="text-start">הזמנות</th><th className="text-start">מכירות</th></tr></thead>
            <tbody>
              {r.by_day.filter((d) => d.orders > 0).map((d) => (
                <tr key={d.day} className="border-t border-line"><td className="py-1">{formatDate(d.day)}</td><td className="tabular-nums">{d.orders}</td><td className="tabular-nums">{formatPrice(d.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </Card>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 font-bold">מכירות לפי קטגוריה</h2>
          <p className="mb-3 text-xs text-ink-soft">לפי הקטגוריה הראשית של המוצר · סכום השורות לפני הנחה ומשלוח</p>
          <HBars rows={r.by_category.map((c) => ({ name: c.name, value: Number(c.revenue), sub: `${c.units} יח׳` }))} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-bold">מוצרים מובילים</h2>
          <HBars rows={r.top_products.map((p) => ({ name: p.name, value: Number(p.revenue), sub: `${p.units} יח׳` }))} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section>
          <h2 className="mb-3 font-bold">לקוחות מובילים</h2>
          <TableWrap>
            <thead><tr><th>לקוח</th><th>הזמנות</th><th>סכום</th></tr></thead>
            <tbody>
              {r.top_customers.map((c) => (
                <tr key={c.email}><td><Link href={`/admin/customers/${encodeURIComponent(c.email)}`} className="font-semibold hover:text-brand">{c.name}</Link></td><td className="tabular-nums">{c.orders}</td><td className="tabular-nums">{formatPrice(c.total)}</td></tr>
              ))}
              {!r.top_customers.length && <tr><td colSpan={3} className="py-6 text-center text-ink-soft">אין נתונים</td></tr>}
            </tbody>
          </TableWrap>
        </section>
        <section>
          <h2 className="mb-3 font-bold">שימוש בקופונים</h2>
          <TableWrap>
            <thead><tr><th>קוד</th><th>הזמנות</th><th>מכירות</th></tr></thead>
            <tbody>
              {r.coupons.map((c) => <tr key={c.code}><td dir="ltr" className="text-end font-semibold">{c.code}</td><td className="tabular-nums">{c.orders}</td><td className="tabular-nums">{formatPrice(c.revenue)}</td></tr>)}
              {!r.coupons.length && <tr><td colSpan={3} className="py-6 text-center text-ink-soft">לא נעשה שימוש בקופונים</td></tr>}
            </tbody>
          </TableWrap>
        </section>
        <section>
          <h2 className="mb-3 font-bold">הרכב ההכנסות</h2>
          <Card className="space-y-2 p-4 text-sm">
            {[
              ["הנחות שניתנו", r.discounts],
              ["דמי משלוח שנגבו", r.shipping],
              ["מע״מ כלול", r.vat],
            ].map(([l, v]) => (
              <p key={String(l)} className="flex justify-between"><span className="text-ink-soft">{l}</span><span className="tabular-nums">{formatPrice(Number(v))}</span></p>
            ))}
            <p className="flex justify-between"><span className="text-ink-soft">הזמנות שבוטלו</span><span className="tabular-nums">{r.cancelled}</span></p>
            {r.promotions.map((p) => (
              <p key={p.name} className="flex justify-between"><span className="text-ink-soft">מבצע ״{p.name}״</span><span className="tabular-nums">{p.orders} הזמנות</span></p>
            ))}
          </Card>
        </section>
      </div>
    </>
  );
}
