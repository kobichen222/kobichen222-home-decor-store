"use client";
import * as Tabs from "@radix-ui/react-tabs";
import { Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { saveProduct } from "@/features/admin/catalog-actions";
import type { ProductForEdit, ProductFormOptions } from "@/features/admin/queries";
import { useFormAction } from "@/lib/use-form-action";
import { formatOptions, parseOptions } from "@/lib/validations/product";
import { cn } from "@/lib/utils";
import { DateTimeField } from "./fields";
import { Card } from "./ui";

type VariantRow = {
  key: string;
  id: string | null;
  sku: string;
  name: string;
  optionsText: string;
  price: string;
  sale_price: string;
  on_hand: string;
  reserved: number;
  low_stock_threshold: string;
  allow_backorder: boolean;
  is_default: boolean;
  is_active: boolean;
};

const TABS = [
  ["general", "פרטים כלליים"],
  ["pricing", "מחירים"],
  ["variants", "וריאציות ומלאי"],
  ["attributes", "מאפיינים"],
  ["details", "מפרט ומשלוח"],
  ["seo", "SEO"],
] as const;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
let counter = 0;
const newKey = () => `new-${++counter}`;

export function ProductForm({ product, options, canManageStock }: { product: ProductForEdit | null; options: ProductFormOptions; canManageStock: boolean }) {
  const { state, pending, onSubmit } = useFormAction(saveProduct);
  const e = state?.errors ?? {};

  const [variants, setVariants] = React.useState<VariantRow[]>(() =>
    product?.variants.length
      ? product.variants.map((v) => ({
          key: v.id,
          id: v.id,
          sku: v.sku,
          name: v.name ?? "",
          optionsText: formatOptions((v.options ?? {}) as Record<string, string>),
          price: str(v.price),
          sale_price: str(v.sale_price),
          on_hand: str(v.inventory?.on_hand ?? 0),
          reserved: v.inventory?.reserved ?? 0,
          low_stock_threshold: str(v.inventory?.low_stock_threshold ?? 3),
          allow_backorder: v.inventory?.allow_backorder ?? false,
          is_default: v.is_default,
          is_active: v.is_active,
        }))
      : [{ key: newKey(), id: null, sku: "", name: "", optionsText: "", price: "", sale_price: "", on_hand: "0", reserved: 0, low_stock_threshold: "3", allow_backorder: false, is_default: true, is_active: true }],
  );
  const [specs, setSpecs] = React.useState<{ label: string; value: string }[]>(() => (product?.specs as { label: string; value: string }[]) ?? []);
  const [sku, setSku] = React.useState(product?.sku ?? "");

  const patch = (key: string, changes: Partial<VariantRow>) => setVariants((rows) => rows.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  const variantsJson = JSON.stringify(
    variants.map((v, i) => ({
      id: v.id,
      // A single-variant product may leave the variant SKU empty: it takes the product SKU.
      sku: v.sku.trim() || (variants.length === 1 ? sku.trim() : `${sku.trim()}-${String(i + 1).padStart(2, "0")}`),
      name: v.name,
      options: parseOptions(v.optionsText),
      price: v.price,
      sale_price: v.sale_price,
      on_hand: v.on_hand || 0,
      low_stock_threshold: v.low_stock_threshold || 0,
      allow_backorder: v.allow_backorder,
      is_default: v.is_default,
      is_active: v.is_active,
    })),
  );

  const selectedCategories = new Set(product?.categories.map((c) => c.category_id));
  const primaryCategory = product?.categories.find((c) => c.is_primary)?.category_id ?? "";
  const selectedValues = new Set(product?.attributes.map((a) => a.attribute_value_id));
  const roots = options.categories.filter((c) => !c.parent_id);
  const panel = "space-y-5 p-5 sm:p-6 data-[state=inactive]:hidden";
  const errorTab: Record<string, string> = { name: "general", slug: "general", sku: "general", price: "pricing", sale_price: "pricing", sale_ends_at: "pricing", variants: "variants" };
  const firstErrorTab = Object.keys(e).map((k) => errorTab[k]).find(Boolean);
  const [tab, setTab] = React.useState("general");
  // After a failed save, jump to the first tab that has an error.
  const [seenState, setSeenState] = React.useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (firstErrorTab) setTab(firstErrorTab);
  }

  return (
    <form onSubmit={onSubmit}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="variants" value={variantsJson} />
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.label.trim() && s.value.trim()))} />

      {state?.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={cn("mb-4 rounded-xl border px-4 py-3 text-sm font-semibold", state.ok ? "border-success/30 bg-success/10 text-success" : "border-danger/30 bg-danger/5 text-danger")}
        >
          {state.message}
          {!state.ok && Object.values(e).length > 0 && `: ${Object.values(e).join(" · ")}`}
        </p>
      )}

      <Card>
        <Tabs.Root value={tab} onValueChange={setTab} dir="rtl">
          <Tabs.List className="no-scrollbar flex gap-1 overflow-x-auto border-b border-line px-3 pt-2" aria-label="חלקי טופס המוצר">
            {TABS.map(([value, label]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="shrink-0 border-b-2 border-transparent px-3.5 py-2.5 text-sm font-semibold text-ink-soft data-[state=active]:border-brand data-[state=active]:text-ink"
              >
                {label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {/* forceMount: every tab's inputs are part of the one submitted form */}
          <Tabs.Content value="general" forceMount className={panel}>
            <Field label="שם המוצר" htmlFor="name" required error={e.name}>
              <Input id="name" name="name" defaultValue={product?.name} required />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="מק״ט" htmlFor="sku" required error={e.sku}>
                <Input id="sku" name="sku" value={sku} onChange={(ev) => setSku(ev.target.value)} dir="ltr" required />
              </Field>
              <Field label="כתובת URL (slug)" htmlFor="slug" error={e.slug} hint="אותיות לטיניות, ספרות ומקפים. ריק = לפי המק״ט">
                <Input id="slug" name="slug" defaultValue={product?.slug} dir="ltr" placeholder="modern-wall-clock" />
              </Field>
              <Field label="סטטוס" htmlFor="status">
                <Select id="status" name="status" defaultValue={product?.status ?? "draft"}>
                  <option value="draft">טיוטה (לא מוצג באתר)</option>
                  <option value="active">פעיל</option>
                  <option value="archived">ארכיון</option>
                </Select>
              </Field>
              <Field label="מותג" htmlFor="brand_id">
                <Select id="brand_id" name="brand_id" defaultValue={product?.brand_id ?? ""}>
                  <option value="">ללא מותג</option>
                  {options.brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="תיאור קצר" htmlFor="short_description" hint="מוצג ליד המחיר ובתוצאות החיפוש">
              <Textarea id="short_description" name="short_description" defaultValue={product?.short_description ?? ""} rows={2} maxLength={300} />
            </Field>
            <Field label="תיאור מלא" htmlFor="description">
              <Textarea id="description" name="description" defaultValue={product?.description ?? ""} rows={7} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm font-semibold">
              <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured} className="size-4 accent-[var(--color-brand)]" />
              מוצר מומלץ (מקבל עדיפות במיון ״מומלצים״)
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">קטגוריות</legend>
              <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {roots.map((root) => (
                  <div key={root.id} className="space-y-1.5">
                    {[root, ...options.categories.filter((c) => c.parent_id === root.id)].map((c) => (
                      <label key={c.id} className={cn("flex items-center gap-2 text-sm", c.parent_id ? "ps-6 text-ink-soft" : "font-semibold")}>
                        <input type="checkbox" name="category_ids" value={c.id} defaultChecked={selectedCategories.has(c.id)} className="size-4 accent-[var(--color-brand)]" />
                        {c.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </fieldset>
            <Field label="קטגוריה ראשית" htmlFor="primary_category_id" hint="קובעת את פירורי הלחם בעמוד המוצר">
              <Select id="primary_category_id" name="primary_category_id" defaultValue={primaryCategory} className="max-w-xs">
                <option value="">הראשונה שנבחרה</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </Tabs.Content>

          <Tabs.Content value="pricing" forceMount className={panel}>
            <p className="text-sm text-ink-soft">כל המחירים בש״ח וכוללים מע״מ.</p>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field label="מחיר רגיל" htmlFor="price" required error={e.price}>
                <Input id="price" name="price" type="number" step="0.01" min="0" defaultValue={str(product?.price)} dir="ltr" required />
              </Field>
              <Field label="מחיר מבצע" htmlFor="sale_price" error={e.sale_price}>
                <Input id="sale_price" name="sale_price" type="number" step="0.01" min="0" defaultValue={str(product?.sale_price)} dir="ltr" />
              </Field>
              <Field label="מחיר עלות" htmlFor="cost_price" hint="פנימי בלבד, אינו מוצג באתר">
                <Input id="cost_price" name="cost_price" type="number" step="0.01" min="0" defaultValue={str(product?.private?.cost_price)} dir="ltr" />
              </Field>
              <Field label="תחילת המבצע" htmlFor="sale_starts_at" hint="ריק = מיידי">
                <DateTimeField id="sale_starts_at" name="sale_starts_at" defaultValue={product?.sale_starts_at ?? null} />
              </Field>
              <Field label="סיום המבצע" htmlFor="sale_ends_at" hint="ריק = ללא הגבלה" error={e.sale_ends_at}>
                <DateTimeField id="sale_ends_at" name="sale_ends_at" defaultValue={product?.sale_ends_at ?? null} />
              </Field>
            </div>
          </Tabs.Content>

          <Tabs.Content value="variants" forceMount className={panel}>
            <p className="text-sm text-ink-soft">
              לכל מוצר יש לפחות וריאציה אחת. במוצר עם אפשרויות בחירה, כתבו את האפשרויות בפורמט <span dir="ltr">צבע: שחור, מידה: 60×90</span>. מחיר ריק = מחיר המוצר.
            </p>
            {e.variants && <p className="text-sm font-semibold text-danger">{e.variants}</p>}
            <div className="space-y-3">
              {variants.map((v, i) => (
                <div key={v.key} className="rounded-xl border border-line p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label="אפשרויות" className="lg:col-span-2">
                      <Input value={v.optionsText} onChange={(ev) => patch(v.key, { optionsText: ev.target.value })} placeholder="צבע: שחור, מידה: 60×90" aria-label={`אפשרויות וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="שם לתצוגה">
                      <Input value={v.name} onChange={(ev) => patch(v.key, { name: ev.target.value })} placeholder="שחור · 60×90" aria-label={`שם וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="מק״ט וריאציה">
                      <Input value={v.sku} onChange={(ev) => patch(v.key, { sku: ev.target.value })} dir="ltr" placeholder={variants.length === 1 ? sku : `${sku}-${String(i + 1).padStart(2, "0")}`} aria-label={`מק״ט וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="מחיר">
                      <Input type="number" step="0.01" min="0" value={v.price} onChange={(ev) => patch(v.key, { price: ev.target.value })} dir="ltr" aria-label={`מחיר וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="מחיר מבצע">
                      <Input type="number" step="0.01" min="0" value={v.sale_price} onChange={(ev) => patch(v.key, { sale_price: ev.target.value })} dir="ltr" aria-label={`מחיר מבצע וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="כמות במלאי" hint={v.reserved > 0 ? `${v.reserved} שמורות להזמנות` : undefined}>
                      <Input type="number" min="0" step="1" value={v.on_hand} onChange={(ev) => patch(v.key, { on_hand: ev.target.value })} dir="ltr" disabled={!canManageStock} aria-label={`מלאי וריאציה ${i + 1}`} />
                    </Field>
                    <Field label="סף התראת מלאי">
                      <Input type="number" min="0" step="1" value={v.low_stock_threshold} onChange={(ev) => patch(v.key, { low_stock_threshold: ev.target.value })} dir="ltr" disabled={!canManageStock} aria-label={`סף התראה וריאציה ${i + 1}`} />
                    </Field>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="_default_variant" checked={v.is_default} onChange={() => setVariants((rows) => rows.map((r) => ({ ...r, is_default: r.key === v.key })))} className="size-4 accent-[var(--color-brand)]" />
                      ברירת מחדל
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={v.is_active} onChange={(ev) => patch(v.key, { is_active: ev.target.checked })} className="size-4 accent-[var(--color-brand)]" />
                      פעילה
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={v.allow_backorder} onChange={(ev) => patch(v.key, { allow_backorder: ev.target.checked })} disabled={!canManageStock} className="size-4 accent-[var(--color-brand)]" />
                      לאפשר הזמנה מוקדמת כשאין מלאי
                    </label>
                    {variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVariants((rows) => {
                            const next = rows.filter((r) => r.key !== v.key);
                            if (!next.some((r) => r.is_default)) next[0].is_default = true;
                            return [...next];
                          })
                        }
                        className="ms-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-danger hover:bg-danger/10"
                      >
                        <Trash2 className="size-4" />
                        הסרה
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setVariants((rows) => [...rows, { key: newKey(), id: null, sku: "", name: "", optionsText: "", price: "", sale_price: "", on_hand: "0", reserved: 0, low_stock_threshold: "3", allow_backorder: false, is_default: false, is_active: true }])
              }
            >
              <Plus className="size-4" />
              הוספת וריאציה
            </Button>
          </Tabs.Content>

          <Tabs.Content value="attributes" forceMount className={panel}>
            <p className="text-sm text-ink-soft">המאפיינים משמשים לסינון בעמודי הקטגוריה ולחיפוש.</p>
            {options.attributes.map((a) => (
              <fieldset key={a.id}>
                <legend className="mb-2 text-sm font-semibold">{a.name}</legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {a.values.map((val) => (
                    <label key={val.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="attribute_value_ids" value={val.id} defaultChecked={selectedValues.has(val.id)} className="size-4 accent-[var(--color-brand)]" />
                      {val.color_hex && <span className="size-4 rounded-full border border-ink/15" style={{ backgroundColor: val.color_hex }} />}
                      {val.value}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </Tabs.Content>

          <Tabs.Content value="details" forceMount className={panel}>
            <div className="grid gap-5 sm:grid-cols-4">
              {(
                [
                  ["width_cm", "רוחב (ס״מ)"],
                  ["height_cm", "גובה (ס״מ)"],
                  ["depth_cm", "עומק (ס״מ)"],
                  ["weight_kg", "משקל (ק״ג)"],
                  ["shipping_weight_kg", "משקל משלוח (ק״ג)"],
                  ["handling_days", "ימי טיפול"],
                  ["delivery_days_min", "אספקה מ־(ימים)"],
                  ["delivery_days_max", "אספקה עד (ימים)"],
                ] as const
              ).map(([name, label]) => (
                <Field key={name} label={label} htmlFor={name}>
                  <Input id={name} name={name} type="number" step="any" min="0" defaultValue={str(product?.[name])} dir="ltr" />
                </Field>
              ))}
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">מפרט טכני</legend>
              <div className="space-y-2">
                {specs.map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={s.label} onChange={(ev) => setSpecs((rows) => rows.map((r, j) => (j === i ? { ...r, label: ev.target.value } : r)))} placeholder="מאפיין" aria-label={`שם מאפיין ${i + 1}`} className="max-w-48" />
                    <Input value={s.value} onChange={(ev) => setSpecs((rows) => rows.map((r, j) => (j === i ? { ...r, value: ev.target.value } : r)))} placeholder="ערך" aria-label={`ערך מאפיין ${i + 1}`} />
                    <button type="button" onClick={() => setSpecs((rows) => rows.filter((_, j) => j !== i))} className="rounded-full p-2.5 text-ink-soft hover:bg-sand hover:text-danger" aria-label="הסרת שורה">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setSpecs((rows) => [...rows, { label: "", value: "" }])}>
                <Plus className="size-4" />
                הוספת שורה
              </Button>
            </fieldset>
            <Field label="הוראות התקנה" htmlFor="installation_instructions">
              <Textarea id="installation_instructions" name="installation_instructions" defaultValue={product?.installation_instructions ?? ""} rows={3} />
            </Field>
            <Field label="הוראות תחזוקה" htmlFor="care_instructions">
              <Textarea id="care_instructions" name="care_instructions" defaultValue={product?.care_instructions ?? ""} rows={3} />
            </Field>
          </Tabs.Content>

          <Tabs.Content value="seo" forceMount className={panel}>
            <Field label="כותרת SEO" htmlFor="seo_title" hint="עד 70 תווים. ריק = שם המוצר">
              <Input id="seo_title" name="seo_title" defaultValue={product?.seo_title ?? ""} maxLength={70} />
            </Field>
            <Field label="תיאור Meta" htmlFor="seo_description" hint="עד 170 תווים. ריק = התיאור הקצר">
              <Textarea id="seo_description" name="seo_description" defaultValue={product?.seo_description ?? ""} rows={2} maxLength={170} />
            </Field>
            <label className="flex items-center gap-2.5 text-sm font-semibold">
              <input type="checkbox" name="noindex" defaultChecked={product?.noindex} className="size-4 accent-[var(--color-brand)]" />
              להסתיר ממנועי חיפוש (noindex)
            </label>
          </Tabs.Content>
        </Tabs.Root>
      </Card>

      <div className="sticky bottom-0 -mx-4 mt-5 flex justify-end gap-2 border-t border-line bg-cream/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "שומר…" : product ? "שמירת שינויים" : "יצירת מוצר"}
        </Button>
      </div>
    </form>
  );
}
