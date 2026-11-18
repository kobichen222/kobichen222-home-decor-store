import { Phone, Search } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { getCategories } from "@/features/catalog/queries";
import { getAnnouncements, getStoreSettings } from "@/features/cms/queries";
import { AnnouncementBar } from "./announcement-bar";
import { CartButton } from "./cart-drawer";
import { MobileMenu } from "./mobile-menu";

export async function Header() {
  const [settings, categories, announcements] = await Promise.all([getStoreSettings(), getCategories(), getAnnouncements()]);
  const tree = categories
    .filter((c) => !c.parent_id)
    .map((c) => ({
      name: c.name,
      slug: c.slug,
      children: categories.filter((s) => s.parent_id === c.id).map((s) => ({ name: s.name, slug: s.slug })),
    }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-cream/95 backdrop-blur supports-[backdrop-filter]:bg-cream/85">
      <AnnouncementBar messages={announcements} />
      <div className="container-page flex h-16 items-center gap-2 lg:h-[4.5rem] lg:gap-8">
        <MobileMenu categories={tree} />
        <Link href="/" className="font-display text-[1.45rem] font-bold tracking-tight lg:text-[1.65rem]" aria-label={`${settings.business.name}, לעמוד הבית`}>
          {settings.business.name}
          <span className="text-gold">.</span>
        </Link>

        <Form action="/shop" role="search" className="relative mx-auto hidden w-full max-w-md lg:block">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
          <input
            name="q"
            type="search"
            placeholder="מה תרצו לעצב היום?"
            aria-label="חיפוש מוצרים"
            className="h-11 w-full rounded-full border border-line bg-white ps-11 pe-4 text-[0.95rem] placeholder:text-ink-soft/70 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </Form>

        <div className="ms-auto flex items-center lg:ms-0">
          <Link href="/shop" className="grid size-11 place-items-center rounded-full hover:bg-sand lg:hidden" aria-label="חיפוש מוצרים">
            <Search className="size-[1.35rem]" strokeWidth={1.6} />
          </Link>
          <Link href="/contact" className="hidden h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold hover:bg-sand lg:flex">
            <Phone className="size-4" strokeWidth={1.6} />
            יצירת קשר
          </Link>
          <CartButton />
        </div>
      </div>

      <nav aria-label="קטגוריות" className="hidden border-t border-line/70 lg:block">
        <ul className="container-page flex items-center justify-center gap-x-1">
          {tree.map((c) => (
            <li key={c.slug} className="group relative">
              <Link
                href={`/category/${c.slug}`}
                className="block px-3 py-3 text-[0.92rem] font-medium text-ink/85 transition-colors hover:text-brand xl:px-3.5"
              >
                {c.name}
              </Link>
              {c.children.length > 0 && (
                <ul className="invisible absolute start-0 top-full z-10 min-w-48 translate-y-1 rounded-xl border border-line bg-white p-2 opacity-0 shadow-soft transition-all duration-200 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {c.children.map((s) => (
                    <li key={s.slug}>
                      <Link href={`/category/${s.slug}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-sand">
                        {s.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
