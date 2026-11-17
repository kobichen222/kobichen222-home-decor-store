"use client";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { useCart } from "./cart-context";
import { CartLines, CartTotals, CouponBox } from "./cart-lines";

export function CartPageView() {
  const { cart, ready, error } = useCart();
  if (!ready) return <div className="h-64 animate-pulse rounded-2xl bg-sand" aria-hidden="true" />;
  if (cart.items.length === 0) {
    return (
      <div className="rounded-2xl bg-sand px-6 py-20 text-center">
        <p className="font-display text-xl font-semibold">הסל שלכם ריק</p>
        <Link href="/shop" className={buttonClass("primary", "md", "mt-6")}>
          לכל המוצרים
        </Link>
      </div>
    );
  }
  const blocked = cart.items.some((i) => !i.purchasable);
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
      <CartLines />
      <aside className="h-fit space-y-5 rounded-2xl border border-line bg-white p-6 lg:sticky lg:top-44">
        <h2 className="text-lg font-bold">סיכום הזמנה</h2>
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
        <Link href="/shop" className="block text-center text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
          המשך קנייה
        </Link>
      </aside>
    </div>
  );
}
