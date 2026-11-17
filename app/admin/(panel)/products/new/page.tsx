import { ProductForm } from "@/components/admin/product-form";
import { AdminHeader } from "@/components/admin/ui";
import { getProductFormOptions } from "@/features/admin/queries";
import { can, requireAdmin } from "@/lib/auth/admin";

export const metadata = { title: "מוצר חדש" };

export default async function NewProductPage() {
  const admin = await requireAdmin("catalog.manage");
  const options = await getProductFormOptions();
  return (
    <>
      <AdminHeader title="מוצר חדש" description="תמונות ניתן להעלות לאחר השמירה הראשונה" back={{ href: "/admin/products", label: "מוצרים" }} />
      <ProductForm product={null} options={options} canManageStock={can(admin, "inventory.manage")} />
    </>
  );
}
