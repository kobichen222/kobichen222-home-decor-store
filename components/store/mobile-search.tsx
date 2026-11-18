"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { StoreImage } from "@/components/shared/store-image";
import type { NavNode } from "./desktop-nav";
import { SearchBox } from "./search-box";

/** Opens the phone search from anywhere (e.g. the menu drawer). */
export function openMobileSearch() {
  window.dispatchEvent(new Event("open-mobile-search"));
}

/** Phone search: a full-screen sheet with live suggestions and quick categories. */
export function MobileSearch({ categories }: { categories: NavNode[] }) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-mobile-search", onOpen);
    return () => window.removeEventListener("open-mobile-search", onOpen);
  }, []);
  const close = () => setOpen(false);
  const quick = categories.flatMap((c) => (c.children.length ? [c] : [c])).slice(0, 8);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="grid size-11 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="חיפוש מוצרים">
        <Search className="size-[1.35rem]" strokeWidth={1.6} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 overflow-y-auto bg-cream data-[state=open]:animate-[fade-in_.18s_ease-out]"
        >
          <div className="flex items-start gap-2 border-b border-line px-3 py-3">
            <Dialog.Close className="mt-0.5 grid size-11 shrink-0 place-items-center rounded-full hover:bg-sand" aria-label="חזרה">
              <ArrowRight className="size-5" />
            </Dialog.Close>
            <Dialog.Title className="sr-only">חיפוש מוצרים</Dialog.Title>
            <SearchBox sheet autoFocus onNavigate={close} className="flex-1" />
          </div>
          <div className="px-4 pb-10 pt-6">
            <p className="mb-3 text-xs font-bold tracking-wide text-ink-soft">עיון לפי קטגוריה</p>
            <ul className="grid grid-cols-2 gap-2.5">
              {quick.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`} onClick={close} className="flex items-center gap-2.5 rounded-xl border border-line bg-white p-2 pe-3 text-sm font-semibold">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-sand">
                      <StoreImage src={c.image_url} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="truncate">{c.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href="/shop" onClick={close} className="mt-4 block text-center text-sm font-semibold text-brand">
              לכל המוצרים
            </Link>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
