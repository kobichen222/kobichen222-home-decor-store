import Link from "next/link";
import { RangePicker } from "@/components/admin/range-picker";
import { AdminHeader, TableWrap } from "@/components/admin/ui";
import { parseRange } from "@/features/admin/report-range";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "דוחות מוצרים" };
type P = { id: string; name: string; sku: string; units: number; revenue: number; returned: number; on_hand: number | null; available: number | null; last_sale_at: string | null; return_rate?: number };

function Table({ title, rows, cols, empty }: { title: string; rows: P[]; cols: [string, (p: P) => React.ReactNode][]; empty: string }) {
  return (
    <section>
      <h2 className="mb-3 font-bold">{title} <span className="text-sm font-normal text-ink-soft">({rows.length})</span></h2>
      <TableWrap>
        <thead><tr><th>מוצר</th>{cols.map(([h]) => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id}>
              <td><Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-brand">{p.name}</Link><div className="text-xs text-ink-soft" dir="ltr">{p.sku}</div></td>
              {cols.map(([h, f]) => <td key={h} className="tabular-nums">{f(p)}</td>)}
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={cols.length + 1} className="py-6 text-center text-ink-soft">{empty}</td></tr>}
        </tbody>
      </TableWrap>
    </section>
  );
}

export default async function ProductsReportPage({ searchParams }: PageProps<"/admin/reports/products">) {
  await requireAdmin("reports.view", "catalog.manage");
  const range = parseRange(await searchParams);
  const db = await createSessionClient();
  const { data, error } = await db.rpc("report_products", { p_from: range.from, p_to: range.to });
  if (error) throw new Error(error.message);
  const r = data as unknown as Record<"top" | "not_sold" | "low_stock" | "no_movement" | "high_returns", P[]>;
  return (
    <>
      <AdminHeader title="דוחות מוצרים" description={`${formatDate(range.from)} – ${formatDate(range.to)}`}>
        <Link href={`/admin/reports?from=${range.from}&to=${range.to}`} className="text-sm font-semibold text-brand hover:underline">לדוח מכירות ←</Link>
      </AdminHeader>
      <RangePicker path="/admin/reports/products" range={range} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Table title="נמכרים ביותר" rows={r.top} empty="לא היו מכירות בתקופה" cols={[["יחידות", (p) => p.units], ["הכנסות", (p) => formatPrice(p.revenue)]]} />
        <Table title="מלאי נמוך" rows={r.low_stock} empty="אין מוצרים במלאי נמוך" cols={[["זמין", (p) => p.available ?? 0], ["במחסן", (p) => p.on_hand ?? 0]]} />
        <Table title="לא נמכרו בתקופה" rows={r.not_sold} empty="כל המוצרים הפעילים נמכרו" cols={[["במלאי", (p) => p.on_hand ?? 0]]} />
        <Table title="מלאי ללא תנועה (90 יום)" rows={r.no_movement} empty="אין מלאי עומד" cols={[["במלאי", (p) => p.on_hand ?? 0], ["מכירה אחרונה", (p) => (p.last_sale_at ? formatDate(p.last_sale_at) : "מעולם")]]} />
        <Table title="שיעור החזרה" rows={r.high_returns} empty="לא היו החזרות בתקופה" cols={[["הוחזרו", (p) => p.returned], ["שיעור", (p) => `${p.return_rate ?? 0}%`]]} />
      </div>
    </>
  );
}
