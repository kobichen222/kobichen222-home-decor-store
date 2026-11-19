import { Compass } from "lucide-react";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { buttonClass } from "@/components/ui/button";
import { getCategories } from "@/features/catalog/queries";
import { SearchBox } from "@/components/store/search-box";

export default async function NotFound() {
  const categories = (await getCategories()).filter((c) => !c.parent_id && c.show_on_home).slice(0, 6);
  return (
    <div className="container-page py-16 sm:py-24">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-sand text-gold">
          <Compass className="size-8" strokeWidth={1.3} />
        </span>
        <p className="mt-6 text-sm font-semibold tracking-[0.24em] text-gold">שגיאה 404</p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">העמוד הזה לא נמצא</h1>
        <p className="mt-3 text-ink-soft">ייתכן שהקישור שגוי או שהעמוד הועבר. נסו לחפש, או המשיכו לאחת הקטגוריות.</p>
        <SearchBox className="mx-auto mt-7 max-w-md text-start" />
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/" className={buttonClass("primary", "md")}>
            לדף הבית
          </Link>
          <Link href="/shop" className={buttonClass("outline", "md")}>
            לכל המוצרים
          </Link>
        </div>
      </div>
      {categories.length > 0 && (
        <ul className="mx-auto mt-14 grid max-w-4xl grid-cols-3 gap-3 sm:grid-cols-6">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/category/${c.slug}`} className="group block text-center">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-sand">
                  <StoreImage src={c.image_url} alt="" fill sizes="(min-width: 640px) 140px, 30vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                </span>
                <span className="mt-2 block text-sm font-semibold group-hover:text-brand">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
