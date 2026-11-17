import Link from "next/link";
import { AdminHeader, Badge, TableWrap } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "קטגוריות" };

export default async function CategoriesPage() {
  await requireAdmin("catalog.manage");
  const db = await createSessionClient();
  const { data } = await db
    .from("categories")
    .select("id, name, slug, parent_id, sort_order, is_active, show_on_home, products:product_categories(count)")
    .order("sort_order");
  const all = data ?? [];
  const rows = all.filter((c) => !c.parent_id).flatMap((root) => [root, ...all.filter((c) => c.parent_id === root.id)]);
  const orphans = all.filter((c) => c.parent_id && !all.some((p) => p.id === c.parent_id));
  return (
    <>
      <AdminHeader title="קטגוריות" description={`${all.length} קטגוריות`}>
        <Link href="/admin/categories/new" className={buttonClass("primary", "md")}>
          + קטגוריה חדשה
        </Link>
      </AdminHeader>
      <TableWrap>
        <thead>
          <tr>
            <th>שם</th>
            <th>כתובת</th>
            <th>מוצרים</th>
            <th>סדר</th>
            <th>סטטוס</th>
          </tr>
        </thead>
        <tbody>
          {[...rows, ...orphans].map((c) => (
            <tr key={c.id}>
              <td className={c.parent_id ? "ps-10!" : "font-bold"}>
                <Link href={`/admin/categories/${c.id}`} className="hover:text-brand">
                  {c.parent_id && <span className="text-ink-soft">↳ </span>}
                  {c.name}
                </Link>
              </td>
              <td dir="ltr" className="text-end text-ink-soft">
                /category/{c.slug}
              </td>
              <td className="tabular-nums">{c.products[0]?.count ?? 0}</td>
              <td className="tabular-nums text-ink-soft">{c.sort_order}</td>
              <td className="space-x-1 space-x-reverse">
                <Badge tone={c.is_active ? "success" : "neutral"}>{c.is_active ? "פעילה" : "מושבתת"}</Badge>
                {c.show_on_home && <Badge tone="warning">בעמוד הבית</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
