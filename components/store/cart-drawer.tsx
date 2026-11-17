"use client";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { useCart } from "./cart-context";
import { CartLines, CartTotals, CouponBox } from "./cart-lines";

export function CartButton() {
  const { cart, setOpen, ready } = useCart();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative grid size-11 place-items-center rounded-full hover:bg-sand"
      aria-label={`סל הקניות, ${cart.item_count} פריטים`}
    >
      <ShoppingBag className="size-[1.35rem]" strokeWidth={1.6} />
      {ready && cart.item_count > 0 && (
        <span className="absolute end-1 top-1 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-brand px-1 text-[0.68rem] font-bold text-cream">
          {cart.item_count}
        </span>
      )}
    </button>
  );
}

export function CartDrawer() {
  const { cart, open, setOpen, error } = useCart();
  const close = () => setOpen(false);
  const blocked = cart.items.some((i) => !i.purchasable);
  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      title={`סל הקניות${cart.item_count ? ` (${cart.item_count})` : ""}`}
      footer={
        cart.items.length > 0 && (
          <div className="space-y-4">
            <CouponBox />
            {error && (
              <p className="text-sm font-medium text-danger" role="alert">
                {error}
              </p>
            )}
            <CartTotals />
            <div className="grid gap-2">
              <Link
                href="/checkout"
                onClick={close}
                aria-disabled={blocked}
                className={buttonClass("primary", "lg", blocked ? "pointer-events-none w-full opacity-50" : "w-full")}
              >
                מעבר לתשלום
              </Link>
              <Link href="/cart" onClick={close} className="text-center text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
                צפייה בסל המלא
              </Link>
            </div>
          </div>
        )
      }
    >
      {cart.items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <ShoppingBag className="size-12 text-gold" strokeWidth={1.2} />
          <p className="font-display text-lg font-semibold">הסל שלכם ריק</p>
          <p className="text-sm text-ink-soft">הגיע הזמן למלא אותו בדברים יפים.</p>
          <Link href="/shop" onClick={close} className={buttonClass("outline", "md")}>
            לכל המוצרים
          </Link>
        </div>
      ) : (
        <div className="px-5">
          <CartLines compact onNavigate={close} />
        </div>
      )}
    </Drawer>
  );
}
