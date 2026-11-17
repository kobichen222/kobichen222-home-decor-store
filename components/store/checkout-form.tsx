"use client";
import { Lock } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { placeOrder } from "@/features/checkout/actions";
import type { CartSummary } from "@/features/cart/types";
import { useFormAction } from "@/lib/use-form-action";
import { cn, formatPrice } from "@/lib/utils";

export type ShippingOption = {
  id: string;
  name: string;
  description: string | null;
  requires_address: boolean;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  summary: CartSummary; // totals priced on the server for this method
};

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 text-xl font-bold">
        <span className="grid size-8 place-items-center rounded-full bg-ink text-sm text-cream">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function CheckoutForm({ options }: { options: ShippingOption[] }) {
  const { state, pending, onSubmit } = useFormAction(placeOrder);
  const [methodId, setMethodId] = React.useState(options[0]?.id ?? "");
  const [type, setType] = React.useState<"private" | "business">("private");
  const option = options.find((o) => o.id === methodId) ?? options[0];
  const summary = option.summary;
  const e = state?.errors ?? {};

  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[1fr_25rem] lg:items-start" noValidate>
      <div className="space-y-6">
        {state?.message && (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 font-semibold text-danger" role="alert">
            {state.message}
          </p>
        )}

        <Step n={1} title="פרטי לקוח">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="שם מלא" htmlFor="name" required error={e.name}>
              <Input id="name" name="name" autoComplete="name" required aria-invalid={!!e.name} />
            </Field>
            <Field label="טלפון נייד" htmlFor="phone" required error={e.phone}>
              <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" dir="ltr" className="text-end" required aria-invalid={!!e.phone} />
            </Field>
            <Field label="דוא״ל" htmlFor="email" required error={e.email} hint="לכאן יישלח אישור ההזמנה" className="sm:col-span-2">
              <Input id="email" name="email" type="email" autoComplete="email" dir="ltr" className="text-end" required aria-invalid={!!e.email} />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-2 text-sm font-semibold">סוג לקוח</legend>
              <div className="flex gap-2">
                {(
                  [
                    ["private", "לקוח פרטי"],
                    ["business", "לקוח עסקי"],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className={cn(
                      "flex h-11 flex-1 cursor-pointer items-center justify-center rounded-full border text-sm font-semibold transition-colors sm:flex-none sm:px-7",
                      type === value ? "border-ink bg-ink text-cream" : "border-line bg-white hover:border-ink",
                    )}
                  >
                    <input type="radio" name="customer_type" value={value} checked={type === value} onChange={() => setType(value)} className="sr-only" />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            {type === "business" && (
              <>
                <Field label="שם החברה" htmlFor="company_name" required error={e.company_name}>
                  <Input id="company_name" name="company_name" autoComplete="organization" aria-invalid={!!e.company_name} />
                </Field>
                <Field label="ח.פ. / עוסק מורשה" htmlFor="company_number" error={e.company_number}>
                  <Input id="company_number" name="company_number" inputMode="numeric" dir="ltr" className="text-end" aria-invalid={!!e.company_number} />
                </Field>
              </>
            )}
          </div>
        </Step>

        <Step n={2} title="אספקה">
          <fieldset>
            <legend className="sr-only">שיטת אספקה</legend>
            <div className="space-y-2.5">
              {options.map((o) => (
                <label
                  key={o.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-colors",
                    o.id === methodId ? "border-brand bg-brand/5" : "border-line hover:border-ink/40",
                  )}
                >
                  <input
                    type="radio"
                    name="shipping_method_id"
                    value={o.id}
                    checked={o.id === methodId}
                    onChange={() => setMethodId(o.id)}
                    className="size-4 accent-[var(--color-brand)]"
                  />
                  <span className="flex-1">
                    <span className="block font-semibold">{o.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {o.description}
                      {o.delivery_days_min && ` · ${o.delivery_days_min}–${o.delivery_days_max} ימי עסקים`}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">{o.summary.shipping > 0 ? formatPrice(o.summary.shipping) : "חינם"}</span>
                </label>
              ))}
            </div>
            {e.shipping_method_id && <p className="mt-2 text-xs font-medium text-danger">{e.shipping_method_id}</p>}
          </fieldset>

          {option.requires_address && (
            <div className="mt-6 grid grid-cols-6 gap-4">
              <Field label="עיר" htmlFor="city" required error={e.city} className="col-span-6 sm:col-span-3">
                <Input id="city" name="city" autoComplete="address-level2" aria-invalid={!!e.city} />
              </Field>
              <Field label="רחוב" htmlFor="street" required error={e.street} className="col-span-6 sm:col-span-3">
                <Input id="street" name="street" autoComplete="address-line1" aria-invalid={!!e.street} />
              </Field>
              <Field label="מספר בית" htmlFor="house_number" required error={e.house_number} className="col-span-2">
                <Input id="house_number" name="house_number" aria-invalid={!!e.house_number} />
              </Field>
              <Field label="דירה" htmlFor="apartment" className="col-span-2">
                <Input id="apartment" name="apartment" />
              </Field>
              <Field label="מיקוד" htmlFor="zip" error={e.zip} className="col-span-2">
                <Input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" dir="ltr" className="text-end" aria-invalid={!!e.zip} />
              </Field>
              <Field label="הערות לשליח" htmlFor="address_notes" className="col-span-6">
                <Input id="address_notes" name="address_notes" placeholder="קומה, קוד כניסה…" />
              </Field>
            </div>
          )}
          <Field label="הערות להזמנה" htmlFor="note" className="mt-4">
            <Textarea id="note" name="note" rows={2} maxLength={500} />
          </Field>
        </Step>

        <Step n={3} title="תשלום">
          <p className="flex items-start gap-3 text-ink-soft">
            <Lock className="mt-1 size-5 shrink-0 text-brand" strokeWidth={1.6} />
            לאחר אישור ההזמנה תועברו לעמוד תשלום מאובטח של חברת הסליקה. פרטי כרטיס האשראי אינם נשמרים באתר.
          </p>
        </Step>
      </div>

      <aside className="space-y-5 rounded-2xl border border-line bg-white p-5 sm:p-6 lg:sticky lg:top-44">
        <h2 className="text-lg font-bold">סיכום הזמנה</h2>
        <ul className="divide-y divide-line">
          {summary.items.map((item) => (
            <li key={item.item_id} className="flex gap-3 py-3">
              <div className="relative h-18 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                <StoreImage src={item.image_url} alt="" fill sizes="56px" className="object-cover" />
                <span className="absolute -end-0 -top-0 grid size-5 place-items-center rounded-full bg-ink text-[0.68rem] font-bold text-cream">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold leading-snug">{item.name}</p>
                {item.variant_name && <p className="text-ink-soft">{item.variant_name}</p>}
              </div>
              <p className="text-sm font-semibold tabular-nums">{formatPrice(item.line_total)}</p>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">סכום ביניים</dt>
            <dd className="tabular-nums">{formatPrice(summary.subtotal)}</dd>
          </div>
          {summary.discount > 0 && (
            <div className="flex justify-between text-success">
              <dt>קופון {summary.coupon?.code}</dt>
              <dd className="tabular-nums">−{formatPrice(summary.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-ink-soft">{option.name}</dt>
            <dd className="tabular-nums">{summary.shipping > 0 ? formatPrice(summary.shipping) : "חינם"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-lg font-bold">
            <dt>סה״כ לתשלום</dt>
            <dd className="tabular-nums" data-testid="checkout-total">
              {formatPrice(summary.total)}
            </dd>
          </div>
          <p className="text-xs text-ink-soft">
            כולל מע״מ ({summary.vat_rate}%): {formatPrice(summary.vat_amount)}
          </p>
        </dl>
        <label className="flex items-start gap-2.5 text-sm">
          <input type="checkbox" name="terms" className="mt-1 size-4 accent-[var(--color-brand)]" aria-invalid={!!e.terms} />
          <span>
            קראתי ואני מאשר/ת את{" "}
            <Link href="/terms" target="_blank" className="font-semibold underline underline-offset-2">
              התקנון
            </Link>{" "}
            ואת{" "}
            <Link href="/privacy" target="_blank" className="font-semibold underline underline-offset-2">
              מדיניות הפרטיות
            </Link>
          </span>
        </label>
        {e.terms && (
          <p className="text-xs font-medium text-danger" role="alert">
            {e.terms}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "יוצר הזמנה…" : "אישור ומעבר לתשלום"}
        </Button>
      </aside>
    </form>
  );
}
