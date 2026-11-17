import Form from "next/form";
import Link from "next/link";
import { AdminHeader, Badge, Empty, TableWrap } from "@/components/admin/ui";
import { StoreImage } from "@/components/shared/store-image";
import { Button, buttonClass } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { duplicateProduct, setProductStatus } from "@/features/admin/catalog-actions";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { formatDate, formatPrice } from "@/lib/utils";

export const metadata = { title: "מוצרים" };
const STATUS = { draft: ["טיוטה", "neutral"], active: ["פעיל", "success"], archived: ["בארכיון", "danger"] } as const;
const PER_PAGE = 25;

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin("catalog.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const status = typeof sp.status === "string" && sp.status in STATUS ? (sp.status as keyof typeof STATUS) : null;
  const page = Math.max(1, Number(sp.page) || 1);

  const db = await createSessionClient();
  let query = db
    .from("products")
    .select(
      "id, name, slug, sku, price, sale_price, status, updated_at, images:product_images(url, is_primary, sort_order), categories:product_categories(is_primary, category:categories(name)), variants:product_variants(id, inventory(on_hand, reserved))",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  if (q) query = query.ilike("search_text", `%${q.toLowerCase().replace(/[%_\\]/g, "\\$&")}%`);
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "archived");
  const { data: products, count, error } = await query;
  if (error) throw new Error(error.message);
  const pages = Math.ceil((count ?? 0) / PER_PAGE);

  return (
    <>
      <AdminHeader title="מוצרים" description={`${count ?? 0} מוצרים`}>
        <Link href="/admin/products/new" className={buttonClass("primary", "md")}>
          + מוצר חדש
        </Link>
      </AdminHeader>
      <Form action="/admin/products" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="חיפוש לפי שם או מק״ט" aria-label="חיפוש מוצרים" className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ""} aria-label="סטטוס" className="w-40">
          <option value="">פעילים וטיוטות</option>
          <option value="active">פעילים</option>
          <option value="draft">טיוטות</option>
          <option value="archived">ארכיון</option>
        </Select>
        <Button type="submit" variant="outline">
          סינון
        </Button>
      </Form>
      {!products?.length ? (
        <Empty>לא נמצאו מוצרים</Empty>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>מוצר</th>
              <th>מק״ט</th>
              <th>קטגוריה</th>
              <th>מחיר</th>
              <th>מלאי זמין</th>
              <th>סטטוס</th>
              <th>עודכן</th>
              <th>פעולות</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const image = [...p.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order)[0];
              const stock = p.variants.reduce((s, v) => s + Math.max((v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0), 0), 0);
              const category = (p.categories.find((c) => c.is_primary) ?? p.categories[0])?.category?.name;
              const [label, tone] = STATUS[p.status];
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-semibold hover:text-brand">
                      <span className="relative block h-12 w-10 shrink-0 overflow-hidden rounded-md bg-sand">
                        <StoreImage src={image?.url} alt="" fill sizes="40px" className="object-cover" />
                      </span>
                      {p.name}
                    </Link>
                  </td>
                  <td dir="ltr" className="text-end text-ink-soft">
                    {p.sku}
                  </td>
                  <td className="text-ink-soft">{category ?? "—"}</td>
                  <td className="tabular-nums">
                    {p.sale_price !== null ? (
                      <>
                        <span className="font-semibold">{formatPrice(p.sale_price)}</span> <s className="text-xs text-ink-soft">{formatPrice(p.price)}</s>
                      </>
                    ) : (
                      <span className="font-semibold">{formatPrice(p.price)}</span>
                    )}
                  </td>
                  <td className="tabular-nums">{stock === 0 ? <Badge tone="danger">אזל</Badge> : stock}</td>
                  <td>
                    <Badge tone={tone}>{label}</Badge>
                  </td>
                  <td className="text-ink-soft">{formatDate(p.updated_at)}</td>
                  <td>
                    <div className="flex gap-1">
                      <form action={setProductStatus}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={p.status === "active" ? "draft" : "active"} />
                        <button type="submit" className="rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-sand">
                          {p.status === "active" ? "השבתה" : "הפעלה"}
                        </button>
                      </form>
                      <form action={duplicateProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="rounded-full px-2.5 py-1 text-xs font-semibold hover:bg-sand">
                          שכפול
                        </button>
                      </form>
                      {p.status !== "archived" && (
                        <form action={setProductStatus}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button type="submit" className="rounded-full px-2.5 py-1 text-xs font-semibold text-danger hover:bg-danger/10">
                            ארכיון
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex justify-center gap-1" aria-label="עמודים">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link
              key={n}
              href={{ pathname: "/admin/products", query: { ...(q && { q }), ...(status && { status }), ...(n > 1 && { page: n }) } }}
              className={`grid size-9 place-items-center rounded-full text-sm font-semibold ${n === page ? "bg-ink text-cream" : "hover:bg-white"}`}
            >
              {n}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
