"use client";
import * as React from "react";
import { addToCart, applyCoupon, removeCoupon, updateCartItem } from "@/features/cart/actions";
import { EMPTY_CART, type CartActionResult, type CartSummary } from "@/features/cart/types";

type CartContextValue = {
  cart: CartSummary;
  ready: boolean;
  pending: boolean;
  error: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Order amount from which shipping is free (null when no such offer). */
  freeShippingFrom: number | null;
  hydrate: (cart: CartSummary, freeShippingFrom?: number | null) => void;
  add: (variantId: string, quantity: number, options?: { openDrawer?: boolean }) => Promise<boolean>;
  setQuantity: (itemId: string, quantity: number) => Promise<boolean>;
  coupon: (code: string | null) => Promise<boolean>;
  clearError: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = React.useState<CartSummary>(EMPTY_CART);
  const [ready, setReady] = React.useState(false);
  const [freeShippingFrom, setFreeShippingFrom] = React.useState<number | null>(null);
  const [open, setOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  const run = React.useCallback((action: () => Promise<CartActionResult>, onOk?: () => void) => {
    return new Promise<boolean>((resolve) => {
      startTransition(async () => {
        try {
          const res = await action();
          setCart(res.cart);
          setError(res.ok ? null : (res.error ?? "אירעה שגיאה"));
          if (res.ok) onOk?.();
          resolve(res.ok);
        } catch {
          setError("אירעה שגיאה. נסו שוב.");
          resolve(false);
        }
      });
    });
  }, []);

  const value = React.useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      pending,
      error,
      open,
      setOpen,
      freeShippingFrom,
      hydrate: (next, freeFrom) => {
        setCart(next);
        if (freeFrom !== undefined) setFreeShippingFrom(freeFrom);
        setReady(true);
      },
      add: (variantId, quantity, options) =>
        run(
          () => addToCart(variantId, quantity),
          () => options?.openDrawer !== false && setOpen(true),
        ),
      setQuantity: (itemId, quantity) => run(() => updateCartItem(itemId, quantity)),
      coupon: (code) => run(() => (code ? applyCoupon(code) : removeCoupon())),
      clearError: () => setError(null),
    }),
    [cart, ready, freeShippingFrom, pending, error, open, run],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

/** Receives the server-read cart and puts it in the client store. */
export function CartHydrator({ cart, freeShippingFrom = null }: { cart: CartSummary; freeShippingFrom?: number | null }) {
  const { hydrate } = useCart();
  React.useEffect(() => hydrate(cart, freeShippingFrom), [cart, freeShippingFrom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
