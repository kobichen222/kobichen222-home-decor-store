"use client";
import { Search, TrendingUp } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import { popularSearches, suggest, type Suggestions } from "@/features/catalog/search-actions";
import { cn, formatPrice } from "@/lib/utils";

export function SearchBox({ className, onNavigate, autoFocus }: { className?: string; onNavigate?: () => void; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [data, setData] = React.useState<Suggestions | null>(null);
  const [popular, setPopular] = React.useState<string[] | null>(null);
  const [active, setActive] = React.useState(-1);
  const listId = React.useId();
  const box = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const t = setTimeout(() => suggest(term).then(setData), 180);
    return () => clearTimeout(t);
  }, [q]);
  React.useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const items: { href: string; label: React.ReactNode; key: string }[] = [];
  if (q.trim().length >= 2 && data) {
    data.categories.forEach((c) => items.push({ key: `c${c.slug}`, href: `/category/${c.slug}`, label: <span>קטגוריה: <strong>{c.name}</strong></span> }));
    data.products.forEach((p) =>
      items.push({
        key: `p${p.slug}`,
        href: `/product/${p.slug}`,
        label: (
          <span className="flex items-center gap-3">
            <span className="relative block h-11 w-9 shrink-0 overflow-hidden rounded bg-sand"><StoreImage src={p.image_url} alt="" fill sizes="36px" className="object-cover" /></span>
            <span className="min-w-0 flex-1 truncate">{p.name}</span>
            <span className="text-sm font-semibold tabular-nums">{formatPrice(p.price)}</span>
          </span>
        ),
      }),
    );
  } else if (popular?.length) {
    popular.forEach((term) => items.push({ key: `s${term}`, href: `/shop?q=${encodeURIComponent(term)}`, label: <span className="flex items-center gap-2"><TrendingUp className="size-4 text-gold" />{term}</span> }));
  }
  const show = open && (items.length > 0 || (q.trim().length >= 2 && data !== null));
  const go = (href: string) => {
    setOpen(false);
    onNavigate?.();
    router.push(href);
  };

  return (
    <div ref={box} className={cn("relative", className)}>
      <Form action="/shop" role="search" onSubmit={() => { setOpen(false); onNavigate?.(); }}>
        <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
        <input
          name="q"
          type="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => { setQ(e.target.value); setActive(-1); setOpen(true); }}
          onFocus={() => {
            setOpen(true);
            if (popular === null) popularSearches().then(setPopular);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, -1)); }
            else if (e.key === "Escape") setOpen(false);
            else if (e.key === "Enter" && active >= 0 && items[active]) { e.preventDefault(); go(items[active].href); }
          }}
          placeholder="מה תרצו לעצב היום?"
          aria-label="חיפוש מוצרים"
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-11 w-full rounded-full border border-line bg-white ps-11 pe-4 text-[0.95rem] placeholder:text-ink-soft/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
      </Form>
      {show && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
          {!q.trim() && popular?.length ? <p className="px-4 pt-3 text-xs font-bold text-ink-soft">חיפושים פופולריים</p> : null}
          <ul id={listId} role="listbox" className="max-h-96 overflow-y-auto p-1.5">
            {items.map((it, i) => (
              <li key={it.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}>
                <Link href={it.href} onClick={() => { setOpen(false); onNavigate?.(); }} className={cn("block rounded-xl px-3 py-2 text-sm hover:bg-sand", i === active && "bg-sand")}>
                  {it.label}
                </Link>
              </li>
            ))}
            {q.trim().length >= 2 && data && items.length === 0 && <li className="px-3 py-3 text-sm text-ink-soft">לא נמצאו התאמות</li>}
          </ul>
          {q.trim().length >= 2 && (
            <Link href={`/shop?q=${encodeURIComponent(q.trim())}`} onClick={() => { setOpen(false); onNavigate?.(); }} className="block border-t border-line px-4 py-2.5 text-sm font-semibold text-brand hover:bg-sand">
              כל התוצאות עבור ״{q.trim()}״
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
