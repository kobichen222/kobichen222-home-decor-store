import Form from "next/form";
import Link from "next/link";
import { StockCell } from "@/components/admin/stock-cell";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "מלאי" };

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  await requireAdmin("inventory.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const filter = sp.filter === "low" || sp.filter === "out" ? sp.filter : "";
  const db = await createSessionClient();
  let query = db
    .from("product_variants")
    .select("id, sku, name, product:products!inner(id, name, status), inventory!inner(on_hand, reserved, low_stock_threshold, allow_backorder)")
    .neq("product.status", "archived")
    .order("sku")
    .limit(500);
  if (q) query = query.ilike("sku", `%${q.replace(/[%_\\]/g, "\\$&")}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const rows = (data ?? [])
    .map((v) => ({ ...v, available: v.inventory.on_hand - v.inventory.reserved }))
    .filter((v) => (filter === "out" ? v.available <= 0 : filter === "low" ? v.available > 0 && v.available <= v.inventory.low_stock_threshold : true));

  return (
    <>
      <AdminHeader title="מלאי" description="מלאי זמין = כמות במחסן פחות כמות שמורה להזמנות שממתינות לתשלום" />
      <Form action="/admin/inventory" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="חיפוש לפי מק״ט" aria-label="חיפוש לפי מק״ט" className="max-w-xs" dir="ltr" />
        <Select name="filter" defaultValue={filter} aria-label="סינון" className="w-40">
          <option value="">כל הפריטים</option>
          <option value="low">מלאי נמוך</option>
          <option value="out">אזל מהמלאי</option>
        </Select>
        <Button type="submit" variant="outline">
          סינון
        </Button>
      </Form>
      {!rows.length ? (
        <Empty>לא נמצאו פריטים</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>מוצר</th>
              <th>מק״ט</th>
              <th>במחסן</th>
              <th>שמור</th>
              <th>זמין</th>
              <th>מצב</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/admin/products/${v.product.id}`} className="font-semibold hover:text-brand">
                    {v.product.name}
                  </Link>
                  {v.name && <span className="text-ink-soft"> · {v.name}</span>}
                </td>
                <td dir="ltr" className="text-end text-ink-soft">
                  {v.sku}
                </td>
                <td>
                  <StockCell variantId={v.id} onHand={v.inventory.on_hand} />
                </td>
                <td className="tabular-nums">{v.inventory.reserved}</td>
                <td className="font-bold tabular-nums">{v.available}</td>
                <td>
                  {v.available <= 0 ? (
                    <Badge tone={v.inventory.allow_backorder ? "warning" : "danger"}>{v.inventory.allow_backorder ? "הזמנה מוקדמת" : "אזל"}</Badge>
                  ) : v.available <= v.inventory.low_stock_threshold ? (
                    <Badge tone="warning">מלאי נמוך</Badge>
                  ) : (
                    <Badge tone="success">תקין</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      )}
    </>
  );
}
