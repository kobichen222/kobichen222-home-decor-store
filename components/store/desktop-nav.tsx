import { ArrowLeft, ChevronDown } from "lucide-react";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { NavCloser } from "./nav-closer";

export type NavNode = { name: string; slug: string; image_url: string | null; children: { name: string; slug: string; image_url: string | null }[] };

// Panels open on hover and on keyboard focus (focus-within), with a short
// delay before closing so the pointer can travel from the link to the panel.
const PANEL =
  "mega-panel invisible absolute inset-x-0 top-full z-20 border-y border-line bg-cream opacity-0 shadow-[0_24px_40px_-28px_rgb(0_0_0/0.35)] transition-[opacity,visibility,transform] delay-75 duration-200 -translate-y-1 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-hover:delay-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100";
const TRIGGER =
  "relative flex items-center gap-1 px-3 py-3.5 text-[0.92rem] font-medium text-ink/85 transition-colors hover:text-ink after:absolute after:inset-x-3 after:bottom-2 after:h-px after:origin-center after:scale-x-0 after:bg-ink after:transition-transform hover:after:scale-x-100 group-focus-within:after:scale-x-100 xl:px-4";

function Tile({ href, name, image }: { href: string; name: string; image: string | null }) {
  return (
    <Link href={href} className="group/tile block">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-sand">
        <StoreImage src={image} alt="" fill sizes="12rem" className="object-cover transition-transform duration-500 group-hover/tile:scale-105" />
      </div>
      <p className="mt-2 text-sm font-semibold group-hover/tile:text-brand">{name}</p>
    </Link>
  );
}

export function DesktopNav({ tree }: { tree: NavNode[] }) {
  // Top-level categories with sub-categories are "spaces" and get their own
  // panel; the rest are product types, gathered under "all products".
  const spaces = tree.filter((c) => c.children.length > 0);
  const types = tree.filter((c) => c.children.length === 0);
  return (
    <nav id="main-nav" aria-label="ניווט ראשי" className="relative hidden border-t border-line/70 lg:block">
      <ul className="container-page flex items-center justify-center">
        <li className="group">
          <Link href="/shop" className={TRIGGER} aria-haspopup="true">
            כל המוצרים
            <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
          </Link>
          <div className={PANEL}>
            <div className="container-page grid grid-cols-[minmax(0,1fr)_16rem] gap-10 py-8">
              <ul className="grid grid-cols-4 gap-5 xl:grid-cols-6">
                {types.map((c) => (
                  <li key={c.slug}>
                    <Tile href={`/category/${c.slug}`} name={c.name} image={c.image_url} />
                  </li>
                ))}
              </ul>
              <div className="flex flex-col justify-between rounded-xl bg-sand p-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.2em] text-gold-ink">הטבה</p>
                  <p className="mt-2 font-display text-xl font-bold leading-snug">מבצעים חמים לזמן מוגבל</p>
                </div>
                <div className="mt-6 space-y-2.5 text-sm font-semibold">
                  <Link href="/shop?sale=1" className="flex items-center gap-1.5 text-brand hover:underline">
                    לכל המבצעים <ArrowLeft className="size-4" />
                  </Link>
                  <Link href="/shop?sort=newest" className="flex items-center gap-1.5 hover:underline">
                    חדש באתר <ArrowLeft className="size-4" />
                  </Link>
                  <Link href="/shop?sort=bestsellers" className="flex items-center gap-1.5 hover:underline">
                    הנמכרים ביותר <ArrowLeft className="size-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </li>
        {spaces.map((c) => (
          <li key={c.slug} className="group">
            <Link href={`/category/${c.slug}`} className={TRIGGER} aria-haspopup="true">
              {c.name}
              <ChevronDown className="size-3.5 transition-transform group-hover:rotate-180" />
            </Link>
            <div className={PANEL}>
              <div className="container-page grid grid-cols-[14rem_minmax(0,1fr)] gap-10 py-8">
                <div>
                  <p className="font-display text-2xl font-bold">{c.name}</p>
                  <Link href={`/category/${c.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
                    לכל המוצרים ב{c.name} <ArrowLeft className="size-4" />
                  </Link>
                </div>
                <ul className="grid grid-cols-4 gap-5 xl:grid-cols-5">
                  {c.children.map((s) => (
                    <li key={s.slug}>
                      <Tile href={`/category/${s.slug}`} name={s.name} image={s.image_url ?? c.image_url} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        ))}
        <li>
          <Link href="/collections" className={TRIGGER}>
            קולקציות
          </Link>
        </li>
        <li>
          <Link href="/blog" className={TRIGGER}>
            השראה
          </Link>
        </li>
        <li>
          <Link href="/shop?sale=1" className={`${TRIGGER} text-brand hover:text-brand-dark after:bg-brand`}>
            מבצעים
          </Link>
        </li>
      </ul>
      <NavCloser />
    </nav>
  );
}
