"use client";
import { Menu } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { SearchBox } from "./search-box";

type Node = { name: string; slug: string; children: { name: string; slug: string }[] };

export function MobileMenu({ categories }: { categories: Node[] }) {
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-11 place-items-center rounded-full hover:bg-sand lg:hidden"
        aria-label="פתיחת התפריט"
      >
        <Menu className="size-6" strokeWidth={1.6} />
      </button>
      <Drawer open={open} onOpenChange={setOpen} title="תפריט" side="start">
        <div className="px-5 py-5">
          <SearchBox onNavigate={close} />
          <nav aria-label="קטגוריות" className="mt-5">
            <ul className="divide-y divide-line">
              <li>
                <Link href="/shop" onClick={close} className="block py-3.5 font-display text-lg font-semibold">
                  כל המוצרים
                </Link>
              </li>
              {categories.map((c) => (
                <li key={c.slug} className="py-1">
                  <Link href={`/category/${c.slug}`} onClick={close} className="block py-2.5 font-display text-lg font-semibold">
                    {c.name}
                  </Link>
                  {c.children.length > 0 && (
                    <ul className="flex flex-wrap gap-2 pb-3">
                      {c.children.map((s) => (
                        <li key={s.slug}>
                          <Link
                            href={`/category/${s.slug}`}
                            onClick={close}
                            className="inline-block rounded-full border border-line bg-white px-3.5 py-1.5 text-sm"
                          >
                            {s.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link href="/collections" onClick={close} className="block py-3.5 font-display text-lg font-semibold">
                  קולקציות
                </Link>
              </li>
              <li>
                <Link href="/contact" onClick={close} className="block py-3.5 font-display text-lg font-semibold">
                  יצירת קשר
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Drawer>
    </>
  );
}
