import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageManager } from "@/components/admin/image-manager";
import { ProductForm } from "@/components/admin/product-form";
import { VideoManager } from "@/components/admin/video-manager";
import { AdminHeader, Badge } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { getProductForEdit, getProductFormOptions } from "@/features/admin/queries";
import { can, requireAdmin } from "@/lib/auth/admin";

export const metadata = { title: "עריכת מוצר" };
const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditProductPage({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const admin = await requireAdmin("catalog.manage");
  const [{ id }, { created, saved }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [product, options] = await Promise.all([getProductForEdit(id), getProductFormOptions()]);
  if (!product) notFound();
  return (
    <>
      <AdminHeader title={product.name} back={{ href: "/admin/products", label: "מוצרים" }}>
        <Badge tone={product.status === "active" ? "success" : product.status === "draft" ? "neutral" : "danger"}>
          {product.status === "active" ? "פעיל" : product.status === "draft" ? "טיוטה" : "בארכיון"}
        </Badge>
        {product.status === "active" && (
          <Link href={`/product/${product.slug}`} target="_blank" className={buttonClass("outline", "sm")}>
            צפייה באתר
          </Link>
        )}
      </AdminHeader>
      {saved && (
        <p className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">
          השינויים נשמרו.
        </p>
      )}
      {created && (
        <p className="mb-4 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status">
          המוצר נוצר. עכשיו אפשר להעלות תמונות.
        </p>
      )}
      <div className="space-y-5">
        <ImageManager productId={product.id} productName={product.name} images={product.images} />
        <VideoManager productId={product.id} videos={product.videos} />
        {/* key: remount with fresh server data after each save */}
        <ProductForm key={`${product.updated_at}-${saved ?? ""}`} product={product} options={options} canManageStock={can(admin, "inventory.manage")} />
      </div>
    </>
  );
}
