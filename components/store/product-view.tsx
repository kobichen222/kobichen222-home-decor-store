"use client";
import { Check, Minus, Plus, Truck } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Button } from "@/components/ui/button";
import type { ProductDetail, ProductVariant } from "@/features/catalog/types";
import { cn, formatPrice } from "@/lib/utils";
import { useCart } from "./cart-context";

function optionKeys(variants: ProductVariant[]): string[] {
  const keys: string[] = [];
  for (const v of variants) for (const k of Object.keys(v.options)) if (!keys.includes(k)) keys.push(k);
  return keys;
}

export function ProductView({ product, children }: { product: ProductDetail; children?: React.ReactNode }) {
  const router = useRouter();
  const { add, pending, error, clearError } = useCart();
  const keys = React.useMemo(() => optionKeys(product.variants), [product.variants]);
  const initial =
    product.variants.find((v) => v.is_default && (v.in_stock || v.allow_backorder)) ??
    product.variants.find((v) => v.in_stock || v.allow_backorder) ??
    product.variants[0];
  const [selected, setSelected] = React.useState<Record<string, string>>(initial.options);
  const [quantity, setQuantity] = React.useState(1);
  const [imageId, setImageId] = React.useState<string | null>(initial.image_id ?? product.images[0]?.id ?? null);
  const [added, setAdded] = React.useState(false);

  const variant = product.variants.find((v) => keys.every((k) => v.options[k] === selected[k])) ?? null;
  const purchasable = !!variant && (variant.in_stock || variant.allow_backorder);
  const maxQty = variant ? (variant.allow_backorder ? 20 : Math.max(variant.available, 1)) : 1;
  const image = product.images.find((i) => i.id === imageId) ?? product.images[0];
  const onSale = !!variant && variant.regular_price > variant.price;

  function choose(key: string, value: string) {
    const next = { ...selected, [key]: value };
    // Keep the selection on a real variant: if the combination does not
    // exist, fall back to the first variant that has the chosen value.
    const exact = product.variants.find((v) => keys.every((k) => v.options[k] === next[k]));
    const target = exact ?? product.variants.find((v) => v.options[key] === value);
    if (!target) return;
    setSelected(target.options);
    setQuantity(1);
    setAdded(false);
    clearError();
    if (target.image_id) setImageId(target.image_id);
  }

  async function submit(buyNow: boolean) {
    if (!variant) return;
    const ok = await add(variant.id, quantity, { openDrawer: !buyNow });
    if (ok && buyNow) router.push("/checkout");
    if (ok) setAdded(true);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-14">
      {/* Gallery */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row-reverse lg:items-start">
        <div className="relative aspect-[4/5] w-full min-w-0 overflow-hidden rounded-2xl bg-sand lg:flex-1">
          {image && (
            <StoreImage
              key={image.id}
              src={image.url}
              alt={image.alt ?? product.name}
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover motion-safe:animate-[fade-in_.35s_ease-out]"
            />
          )}
          {onSale && variant && (
            <span className="absolute start-4 top-4 rounded-full bg-brand px-3 py-1.5 text-sm font-bold text-cream">
              −{Math.round(((variant.regular_price - variant.price) / variant.regular_price) * 100)}%
            </span>
          )}
        </div>
        {product.images.length > 1 && (
          <ul className="no-scrollbar flex gap-2.5 overflow-x-auto p-1 lg:w-22 lg:shrink-0 lg:flex-col lg:overflow-visible" aria-label="תמונות המוצר">
            {product.images.map((img, i) => (
              <li key={img.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setImageId(img.id)}
                  aria-label={`תמונה ${i + 1} מתוך ${product.images.length}`}
                  aria-current={img.id === image?.id}
                  className={cn(
                    "relative block h-20 w-16 overflow-hidden rounded-lg bg-sand ring-offset-2 ring-offset-cream transition-shadow lg:h-24 lg:w-20",
                    img.id === image?.id ? "ring-2 ring-brand" : "opacity-75 hover:opacity-100",
                  )}
                >
                  <StoreImage src={img.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Purchase panel */}
      <div className="lg:sticky lg:top-44 lg:self-start">
        {product.brand && <p className="text-sm font-semibold tracking-wide text-brand">{product.brand.name}</p>}
        <h1 className="mt-1 text-3xl font-bold tracking-tight lg:text-[2.3rem]">{product.name}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          מק״ט: <span dir="ltr">{variant?.sku ?? product.sku}</span>
        </p>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-3xl font-bold tabular-nums">{formatPrice(variant?.price ?? product.variants[0].price)}</span>
          {onSale && variant && <s className="text-lg text-ink-soft tabular-nums">{formatPrice(variant.regular_price)}</s>}
          <span className="text-sm text-ink-soft">כולל מע״מ</span>
        </div>

        {product.short_description && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{product.short_description}</p>}

        <div className="mt-7 space-y-6">
          {keys.map((key) => {
            const values = [...new Set(product.variants.map((v) => v.options[key]).filter(Boolean))];
            const isColor = values.some((v) => product.colorHex[v]);
            return (
              <fieldset key={key}>
                <legend className="mb-2.5 text-sm">
                  <span className="font-bold">{key}:</span> <span className="text-ink-soft">{selected[key]}</span>
                </legend>
                <div className="flex flex-wrap gap-2.5">
                  {values.map((value) => {
                    const active = selected[key] === value;
                    // Is this value buyable together with the other current choices?
                    const match = product.variants.find(
                      (v) => v.options[key] === value && keys.every((k) => k === key || v.options[k] === selected[k]),
                    );
                    const unavailable = !match || !(match.in_stock || match.allow_backorder);
                    return isColor ? (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(key, value)}
                        aria-pressed={active}
                        aria-label={`${key} ${value}${unavailable ? " (אזל מהמלאי)" : ""}`}
                        title={value}
                        className={cn(
                          "relative size-10 rounded-full border border-ink/15 ring-offset-2 ring-offset-cream transition-shadow",
                          active && "ring-2 ring-brand",
                          unavailable && "opacity-40",
                        )}
                        style={{ backgroundColor: product.colorHex[value] ?? "#ccc" }}
                      >
                        {unavailable && <span className="absolute inset-x-0 top-1/2 h-px -rotate-45 bg-ink" aria-hidden="true" />}
                      </button>
                    ) : (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(key, value)}
                        aria-pressed={active}
                        className={cn(
                          "h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                          active ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink",
                          unavailable && !active && "text-ink-soft line-through decoration-ink-soft/50",
                        )}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <p className="flex items-center gap-2 text-sm font-semibold" role="status">
            <span className={cn("size-2 rounded-full", purchasable ? (variant?.low_stock ? "bg-gold" : "bg-success") : "bg-danger")} />
            {!variant || !purchasable
              ? "אזל מהמלאי"
              : !variant.in_stock
                ? "זמין בהזמנה מוקדמת"
                : variant.low_stock
                  ? `נותרו ${variant.available} יחידות אחרונות`
                  : "במלאי"}
          </p>

          <div className="flex flex-wrap items-stretch gap-3">
            <div className="inline-flex items-center rounded-full border border-line bg-white">
              <button
                type="button"
                className="grid size-13 place-items-center rounded-full hover:bg-sand disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="הפחתת כמות"
              >
                <Minus className="size-4" />
              </button>
              <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite" aria-label="כמות">
                {quantity}
              </span>
              <button
                type="button"
                className="grid size-13 place-items-center rounded-full hover:bg-sand disabled:opacity-40"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={!purchasable || quantity >= maxQty}
                aria-label="הגדלת כמות"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <Button size="lg" className="min-w-44 flex-1" disabled={!purchasable || pending} onClick={() => submit(false)}>
              {added && !pending ? (
                <>
                  <Check className="size-5" /> נוסף לסל
                </>
              ) : (
                "הוספה לסל"
              )}
            </Button>
          </div>
          <Button variant="outline" size="lg" className="w-full" disabled={!purchasable || pending} onClick={() => submit(true)}>
            קנייה מהירה
          </Button>
          {error && (
            <p className="text-sm font-semibold text-danger" role="alert">
              {error}
            </p>
          )}

          {(product.delivery_days_min || product.delivery_days_max) && (
            <p className="flex items-center gap-2.5 rounded-xl bg-sand px-4 py-3 text-sm">
              <Truck className="size-5 shrink-0 text-brand" strokeWidth={1.5} />
              אספקה תוך {product.delivery_days_min}–{product.delivery_days_max} ימי עסקים · משלוח חינם מעל 499 ₪
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
