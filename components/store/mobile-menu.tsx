"use client";
import { Menu, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import * as React from "react";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/field";

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
          <Form action="/shop" onSubmit={close} className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
            <Input name="q" type="search" placeholder="חיפוש מוצרים" aria-label="חיפוש מוצרים" className="ps-10" />
          </Form>
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
