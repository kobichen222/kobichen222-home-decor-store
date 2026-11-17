import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/category-form";
import { AdminHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";

export const metadata = { title: "קטגוריה" };
const UUID = /^[0-9a-f-]{36}$/i;

// /admin/categories/new and /admin/categories/<id> share this page.
export default async function CategoryPage({ params }: PageProps<"/admin/categories/[id]">) {
  await requireAdmin("catalog.manage");
  const { id } = await params;
  const db = await createSessionClient();
  const { data: all } = await db
    .from("categories")
    .select("id, name, slug, parent_id, description, image_url, sort_order, is_active, show_on_home, seo_title, seo_description")
    .order("sort_order");
  const category = id === "new" ? null : UUID.test(id) ? ((all ?? []).find((c) => c.id === id) ?? null) : null;
  if (id !== "new" && !category) notFound();
  return (
    <>
      <AdminHeader title={category?.name ?? "קטגוריה חדשה"} back={{ href: "/admin/categories", label: "קטגוריות" }} />
      <CategoryForm category={category} parents={(all ?? []).filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
