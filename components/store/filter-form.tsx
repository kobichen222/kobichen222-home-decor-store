"use client";
import { SlidersHorizontal } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import * as React from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import type { Facets } from "@/features/catalog/types";
import { SORT_OPTIONS } from "@/features/catalog/types";
import { cn } from "@/lib/utils";

type Current = {
  q: string | null;
  valueIds: string[];
  minPrice: number | null;
  maxPrice: number | null;
  onSale: boolean;
  inStock: boolean;
  sort: string;
};

// A plain GET form: filters live in the URL, work without client state and
// can be shared. On desktop it submits on change; in the mobile drawer the
// shopper picks several options and applies them once.
function Fields({ facets, current, idPrefix }: { facets: Facets; current: Current; idPrefix: string }) {
  return (
    <div className="space-y-7">
      {facets.attributes.map((attr) => (
        <fieldset key={attr.id}>
          <legend className="mb-3 text-sm font-bold">{attr.name}</legend>
          <div className={cn(attr.kind === "color" ? "flex flex-wrap gap-2.5" : "space-y-2.5")}>
            {attr.values.map((v) => {
              const id = `${idPrefix}-${v.id}`;
              const checked = current.valueIds.includes(v.id);
              return attr.kind === "color" ? (
                <label key={v.id} htmlFor={id} title={v.value} className="relative cursor-pointer">
                  <input id={id} type="checkbox" name="f" value={v.id} defaultChecked={checked} className="peer sr-only" />
                  <span
                    className="block size-8 rounded-full border border-ink/15 ring-offset-2 ring-offset-cream transition-shadow peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-ink"
                    style={{ backgroundColor: v.color_hex ?? "#ccc" }}
                  />
                  <span className="sr-only">
                    {v.value} ({v.count})
                  </span>
                </label>
              ) : (
                <label key={v.id} htmlFor={id} className="flex cursor-pointer items-center gap-2.5 text-[0.95rem]">
                  <input id={id} type="checkbox" name="f" value={v.id} defaultChecked={checked} className="size-4 accent-[var(--color-brand)]" />
                  <span>{v.value}</span>
                  <span className="text-xs text-ink-soft">({v.count})</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <fieldset>
        <legend className="mb-3 text-sm font-bold">מחיר (₪)</legend>
        <div className="flex items-center gap-2">
          <input
            type="number"
            name="min"
            min={0}
            inputMode="numeric"
            defaultValue={current.minPrice ?? ""}
            placeholder={facets.price_min !== null ? String(facets.price_min) : "מ־"}
            aria-label="מחיר מינימלי"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
          />
          <span className="text-ink-soft">–</span>
          <input
            type="number"
            name="max"
            min={0}
            inputMode="numeric"
            defaultValue={current.maxPrice ?? ""}
            placeholder={facets.price_max !== null ? String(facets.price_max) : "עד"}
            aria-label="מחיר מקסימלי"
            className="h-10 w-full rounded-lg border border-line bg-white px-3 text-sm"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-2.5">
        <legend className="mb-3 text-sm font-bold">זמינות ומבצעים</legend>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.95rem]">
          <input type="checkbox" name="stock" value="1" defaultChecked={current.inStock} className="size-4 accent-[var(--color-brand)]" />
          במלאי בלבד
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-[0.95rem]">
          <input type="checkbox" name="sale" value="1" defaultChecked={current.onSale} className="size-4 accent-[var(--color-brand)]" />
          מוצרים בהנחה
          <span className="text-xs text-ink-soft">({facets.on_sale_count})</span>
        </label>
      </fieldset>
    </div>
  );
}

type FilterProps = { action: string; facets: Facets; current: Current; activeCount: number };

function HiddenScope({ current }: { current: Current }) {
  return (
    <>
      {current.q && <input type="hidden" name="q" value={current.q} />}
      {current.sort !== "featured" && <input type="hidden" name="sort" value={current.sort} />}
    </>
  );
}

function clearHref(action: string, current: Current) {
  return action + (current.q ? `?q=${encodeURIComponent(current.q)}` : "");
}

export function FilterSidebar({ action, facets, current, activeCount }: FilterProps) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="סינון מוצרים">
      {/* key: re-mount the uncontrolled inputs whenever the applied filters change */}
      <Form
        key={JSON.stringify(current)}
        ref={ref}
        action={action}
        onChange={(e) => {
          if ((e.target as HTMLElement).getAttribute("type") !== "number") ref.current?.requestSubmit();
        }}
        className="sticky top-44"
      >
        <HiddenScope current={current} />
        <Fields facets={facets} current={current} idPrefix="d" />
        <div className="mt-6 flex gap-2">
          <Button type="submit" variant="outline" size="sm">
            עדכון מחיר
          </Button>
          {activeCount > 0 && (
            <Link href={clearHref(action, current)} className={buttonClass("ghost", "sm")}>
              ניקוי
            </Link>
          )}
        </div>
      </Form>
    </aside>
  );
}

export function MobileFilters({ action, facets, current, activeCount }: FilterProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass("outline", "sm", "lg:hidden")}>
        <SlidersHorizontal className="size-4" />
        סינון{activeCount > 0 && ` (${activeCount})`}
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="סינון מוצרים" side="start">
        <Form key={JSON.stringify(current)} action={action} onSubmit={() => setOpen(false)} className="flex min-h-full flex-col">
          <HiddenScope current={current} />
          <div className="flex-1 px-5 py-5">
            <Fields facets={facets} current={current} idPrefix="m" />
          </div>
          <div className="sticky bottom-0 flex gap-2 border-t border-line bg-white px-5 py-4">
            <Button type="submit" className="flex-1">
              הצגת תוצאות
            </Button>
            {activeCount > 0 && (
              <Link href={clearHref(action, current)} onClick={() => setOpen(false)} className={buttonClass("ghost", "md")}>
                ניקוי
              </Link>
            )}
          </div>
        </Form>
      </Drawer>
    </>
  );
}

export function SortSelect({ action, current }: { action: string; current: Current }) {
  const ref = React.useRef<HTMLFormElement>(null);
  return (
    <Form ref={ref} action={action} className="flex items-center gap-2">
      {current.q && <input type="hidden" name="q" value={current.q} />}
      {current.valueIds.map((id) => (
        <input key={id} type="hidden" name="f" value={id} />
      ))}
      {current.minPrice !== null && <input type="hidden" name="min" value={current.minPrice} />}
      {current.maxPrice !== null && <input type="hidden" name="max" value={current.maxPrice} />}
      {current.onSale && <input type="hidden" name="sale" value="1" />}
      {current.inStock && <input type="hidden" name="stock" value="1" />}
      <label htmlFor="sort" className="text-sm text-ink-soft max-sm:sr-only">
        מיון:
      </label>
      <select
        id="sort"
        name="sort"
        key={current.sort}
        defaultValue={current.sort}
        onChange={() => ref.current?.requestSubmit()}
        className="h-9 rounded-full border border-line bg-white ps-3.5 pe-8 text-sm font-semibold"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Form>
  );
}
