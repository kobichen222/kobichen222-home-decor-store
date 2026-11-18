import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account-nav";
import { ProductGrid } from "@/components/store/product-card";
import { buttonClass } from "@/components/ui/button";
import type { ProductCard } from "@/features/catalog/types";
import { getCustomer } from "@/lib/auth/customer";
import { createSessionClient } from "@/lib/supabase/server";

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
        <div className="rounded-2xl bg-sand px-6 py-14 text-center">
          <p className="font-semibold">עדיין לא שמרתם מוצרים</p>
          <p className="mt-1 text-sm text-ink-soft">לחצו על הלב במוצר כדי לשמור אותו כאן.</p>
          <Link href="/shop" className={buttonClass("primary", "md", "mt-5")}>לחנות</Link>
        </div>
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
