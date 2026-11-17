"use client";
import { Minus, Plus, Tag, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "./cart-context";

export function CartLines({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { cart, setQuantity, pending } = useCart();
  return (
    <ul className={cn("divide-y divide-line", pending && "opacity-70 transition-opacity")}>
      {cart.items.map((item) => (
        <li key={item.item_id} className="flex gap-4 py-4">
          <Link
            href={`/product/${item.slug}`}
            onClick={onNavigate}
            className={cn("relative shrink-0 overflow-hidden rounded-lg bg-sand", compact ? "h-24 w-20" : "h-32 w-26")}
          >
            <StoreImage src={item.image_url} alt={item.name} fill sizes="110px" className="object-cover" />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/product/${item.slug}`} onClick={onNavigate} className="font-semibold leading-snug hover:text-brand">
                  {item.name}
                </Link>
                {item.variant_name && <p className="mt-0.5 text-sm text-ink-soft">{item.variant_name}</p>}
              </div>
              <button
                type="button"
                onClick={() => setQuantity(item.item_id, 0)}
                className="rounded-full p-1.5 text-ink-soft hover:bg-sand hover:text-danger"
                aria-label={`הסרת ${item.name} מהסל`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
            {!item.purchasable && (
              <p className="mt-1 text-xs font-semibold text-danger">
                {item.unit_price === null
                  ? "המוצר אינו זמין עוד"
                  : item.available > 0
                    ? `נותרו ${item.available} יחידות בלבד. עדכנו את הכמות`
                    : "אזל מהמלאי"}
              </p>
            )}
            <div className="mt-auto flex items-end justify-between pt-2">
              <div className="inline-flex items-center rounded-full border border-line bg-white">
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40"
                  onClick={() => setQuantity(item.item_id, item.quantity - 1)}
                  aria-label="הפחתת כמות"
                >
                  <Minus className="size-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  className="grid size-9 place-items-center rounded-full hover:bg-sand disabled:opacity-40"
                  onClick={() => setQuantity(item.item_id, item.quantity + 1)}
                  disabled={!item.allow_backorder && item.quantity >= item.available}
                  aria-label="הגדלת כמות"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="text-end">
                {item.regular_price !== null && item.unit_price !== null && item.regular_price > item.unit_price && (
                  <div className="text-xs text-ink-soft line-through">{formatPrice(item.regular_price * item.quantity)}</div>
                )}
                <div className="font-semibold tabular-nums">{formatPrice(item.line_total)}</div>
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function CouponBox() {
  const { cart, coupon, pending } = useCart();
  const [code, setCode] = React.useState("");
  if (cart.coupon?.valid) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-success/10 px-3.5 py-2.5 text-sm">
        <span className="flex items-center gap-2 font-semibold text-success">
          <Tag className="size-4" />
          קופון {cart.coupon.code} הופעל
        </span>
        <button type="button" onClick={() => coupon(null)} className="rounded-full p-1 hover:bg-white" aria-label="הסרת הקופון">
          <X className="size-4" />
        </button>
      </div>
    );
  }
  return (
    <form
      className="flex gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (code.trim() && (await coupon(code))) setCode("");
      }}
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="קוד קופון"
        aria-label="קוד קופון"
        className="h-10"
        autoComplete="off"
        dir="ltr"
      />
      <Button type="submit" variant="outline" size="sm" className="h-10 shrink-0" disabled={pending || !code.trim()}>
        החלה
      </Button>
    </form>
  );
}

export function CartTotals({ showShipping = false }: { showShipping?: boolean }) {
  const { cart } = useCart();
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-ink-soft">סכום ביניים</dt>
        <dd className="tabular-nums">{formatPrice(cart.subtotal)}</dd>
      </div>
      {cart.discount > 0 && (
        <div className="flex justify-between text-success">
          <dt>הנחת קופון</dt>
          <dd className="tabular-nums">−{formatPrice(cart.discount)}</dd>
        </div>
      )}
      {showShipping ? (
        <div className="flex justify-between">
          <dt className="text-ink-soft">משלוח</dt>
          <dd className="tabular-nums">{cart.shipping > 0 ? formatPrice(cart.shipping) : "חינם"}</dd>
        </div>
      ) : (
        <div className="flex justify-between">
          <dt className="text-ink-soft">משלוח</dt>
          <dd className="text-ink-soft">יחושב בקופה</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-line pt-3 text-base font-bold">
        <dt>סה״כ</dt>
        <dd className="tabular-nums">{formatPrice(cart.total)}</dd>
      </div>
      <p className="text-xs text-ink-soft">המחירים כוללים מע״מ</p>
    </dl>
  );
}
