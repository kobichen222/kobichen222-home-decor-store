import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account-nav";
import { ProductGrid } from "@/components/store/product-card";
import type { ProductCard } from "@/features/catalog/types";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";
import { Heart } from "lucide-react";
import { EmptyState } from "@/components/store/empty-state";

export const metadata: Metadata = { title: "המועדפים שלי", robots: { index: false } };

async function Wishlist() {
  const customer = await getCustomer();
  if (!customer) redirect("/account/login?next=/account/wishlist");
  const db = await createSessionClient();
  const { data: items } = await db.from("wishlist_items").select("product_id, wishlist:wishlists!inner(user_id)").eq("wishlist.user_id", customer.id);
  const ids = (items ?? []).map((i) => i.product_id);
  const { data: products } = ids.length ? await db.from("catalog_products").select("*").in("id", ids) : { data: [] };
  return (
    <AccountShell active="/account/wishlist" title="המועדפים שלי">
      {!products?.length ? (
        <EmptyState icon={Heart} title="עדיין לא שמרתם מוצרים" text="לחצו על הלב במוצר שאהבתם, והוא יחכה לכם כאן." actions={[{ href: "/shop", label: "לחנות" }]} />
      ) : (
        <ProductGrid products={products as unknown as ProductCard[]} />
      )}
    </AccountShell>
  );
}

export default function WishlistPage() {
  return (
    <Suspense fallback={<div className="container-page py-12"><div className="h-72 animate-pulse rounded-2xl bg-sand" /></div>}>
      <Wishlist />
    </Suspense>
  );
}
