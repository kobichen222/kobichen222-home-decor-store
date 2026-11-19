"use client";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-context";
import { EmptyState } from "./empty-state";
import { CartLines, CartTotals, CouponBox, FreeShippingProgress, SecureNote } from "./cart-lines";

export function CartPageView() {
  const { cart, ready, error } = useCart();
  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-sand" aria-hidden="true" />;
  if (cart.items.length === 0) {
    return (
      <EmptyState icon={ShoppingBag} title="הסל שלכם ריק" text="הגיע הזמן למלא אותו בדברים יפים." actions={[{ href: "/shop", label: "לכל המוצרים" }, { href: "/collections", label: "לקולקציות" }]} />
    );
  }
  const blocked = cart.items.some((i) => !i.purchasable);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <CartLines />
      <aside className="h-fit space-y-5 rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-44">
        <h2 className="text-lg font-bold">סיכום הזמנה</h2>
        <FreeShippingProgress />
        <CouponBox />
        {error && (
          <p className="text-sm font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <CartTotals />
        <Link
          href="/checkout"
          aria-disabled={blocked}
          className={buttonClass("primary", "lg", blocked ? "pointer-events-none w-full opacity-50" : "w-full")}
        >
          מעבר לתשלום
        </Link>
        <SecureNote />
        <Link href="/shop" className="block text-center text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
          המשך קנייה
        </Link>
      </aside>
    </div>
  );
}
