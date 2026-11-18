import { ArrowLeft, Gem, Headset, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { buttonClass } from "@/components/ui/button";
import { getCategories, getCollections, getProductGrid } from "@/features/catalog/queries";
import type { PageSection } from "@/features/cms/queries";
import { cn, safeInternalPath } from "@/lib/utils";
import { NewsletterForm } from "./newsletter-form";
import { Carousel } from "./carousel";
import { ProductCard } from "./product-card";
import { SectionHeading } from "./section-heading";

type LinkData = { label?: string; href?: string };

const EYEBROWS: Record<string, string> = {
  bestsellers: "האהובים עליכם",
  newest: "זה עתה הגיע",
  sale: "לזמן מוגבל",
  featured: "בחירת המעצבים",
};

function Hero({ data }: { data: Record<string, unknown> }) {
  const primary = data.primary as LinkData | undefined;
  const secondary = data.secondary as LinkData | undefined;
  return (
    <section className="bg-sand">
      <div className="grid lg:min-h-[min(40rem,calc(100svh-10rem))] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="order-2 flex items-center px-4 pb-12 pt-9 sm:px-6 lg:order-1 lg:py-20 lg:pe-14 lg:ps-[max(2.5rem,calc((100vw-82rem)/2+2.5rem))]">
          <div className="max-w-xl motion-safe:animate-[rise_0.9s_var(--ease-out-soft)_both]">
            {typeof data.eyebrow === "string" && (
              <p className="mb-4 flex items-center gap-3 text-xs font-semibold tracking-[0.24em] text-brand sm:text-sm">
                <span aria-hidden className="h-px w-8 bg-gold" />
                {data.eyebrow}
              </p>
            )}
            <h1 className="text-[2.3rem] font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.1rem] xl:text-[3.5rem]">{data.title as string}</h1>
            {typeof data.subtitle === "string" && <p className="mt-5 max-w-md text-lg text-ink-soft lg:text-xl">{data.subtitle}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {primary?.label && (
                <Link href={safeInternalPath(primary.href, "/shop")} className={buttonClass("primary", "lg", "max-sm:w-full")}>
                  {primary.label}
                </Link>
              )}
              {secondary?.label && (
                <Link href={safeInternalPath(secondary.href, "/shop")} className={buttonClass("outline", "lg", "max-sm:w-full")}>
                  {secondary.label}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="relative order-1 aspect-[5/4] overflow-hidden sm:aspect-[16/9] lg:order-2 lg:aspect-auto">
          <StoreImage
            src={(data.image_url as string) ?? null}
            alt={(data.image_alt as string) ?? ""}
            fill
            priority
            sizes="(min-width: 1024px) 58vw, 100vw"
            className="object-cover object-center motion-safe:animate-[settle_1.6s_var(--ease-out-soft)_both]"
          />
        </div>
      </div>
    </section>
  );
}

async function Categories({ title }: { title: string | null }) {
  const categories = (await getCategories()).filter((c) => c.show_on_home);
  if (!categories.length) return null;
  return (
    <section className="container-page">
      <Carousel title={title} eyebrow="מה מחפשים היום?" href="/shop" linkLabel="לכל הקטגוריות" label="קטגוריות">
        {categories.map((c) => (
          <li key={c.id} className="w-[38%] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-7.5rem)/6)]">
            <Link href={`/category/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
                <StoreImage
                  src={c.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 15vw, (min-width: 640px) 24vw, 38vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-center font-semibold transition-colors group-hover:text-brand">{c.name}</p>
            </Link>
          </li>
        ))}
      </Carousel>
    </section>
  );
}

async function ProductsSection({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  const source = (["bestsellers", "newest", "sale", "featured"] as const).find((s) => s === data.source) ?? "featured";
  const products = await getProductGrid(source, Math.min(Number(data.limit) || 8, 12));
  if (!products.length) return null;
  return (
    <section className="container-page">
      <Carousel title={title} eyebrow={EYEBROWS[source]} href={data.href as string | undefined} label={title ?? "מוצרים"}>
        {products.map((p) => (
          <li key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-4.5rem)/4)]">
            <ProductCard product={p} />
          </li>
        ))}
      </Carousel>
    </section>
  );
}

async function Rooms({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  const items = (data.items as LinkData[] | undefined) ?? [];
  if (!items.length) return null;
  // Rooms usually point at categories: reuse the category picture as the tile.
  const images = new Map((await getCategories()).map((c) => [`/category/${c.slug}`, c.image_url]));
  return (
    <section className="bg-sand py-14 lg:py-20">
      <div className="container-page">
        <SectionHeading title={title} eyebrow="השראה לכל חלל" />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-5">
          {items.map((item) => {
            const href = safeInternalPath(item.href, "/shop");
            const image = images.get(href.split("?")[0]) ?? null;
            return (
              <li key={item.href}>
                <Link href={href} className="group relative block aspect-[4/3] overflow-hidden rounded-xl bg-cream lg:aspect-[16/10]">
                  {image && (
                    <StoreImage
                      src={image}
                      alt=""
                      fill
                      sizes="(min-width: 640px) 33vw, 50vw"
                      className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/0 via-45% to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 p-4 text-cream lg:p-5">
                    <span className="font-display text-lg font-bold lg:text-xl">{item.label}</span>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream/90 text-ink transition-transform group-hover:-translate-x-1 max-sm:hidden">
                      <ArrowLeft className="size-4" />
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

async function Collections({ title }: { title: string | null }) {
  const collections = (await getCollections()).slice(0, 4);
  if (!collections.length) return null;
  return (
    <section className="container-page">
      <SectionHeading title={title} eyebrow="סגנונות שאוהבים" href="/collections" linkLabel="לכל הקולקציות" />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {collections.map((c) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden rounded-xl bg-sand">
              <StoreImage
                src={c.image_url}
                alt=""
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/75 to-transparent p-5 pt-16 text-cream">
                <h3 className="text-xl font-bold">{c.name}</h3>
                {c.description && <p className="mt-1 text-sm text-cream/85">{c.description}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const ICONS = { truck: Truck, shield: ShieldCheck, gem: Gem, headset: Headset } as const;

function Benefits({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  const items = (data.items as { icon?: string; title: string; text: string }[] | undefined) ?? [];
  if (!items.length) return null;
  return (
    <section className="container-page">
      {title && <h2 className="sr-only">{title}</h2>}
      <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Gem;
          return (
            <li key={item.title} className="flex items-start gap-4 bg-cream p-6 lg:p-7">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-sand text-brand">
                <Icon className="size-6" strokeWidth={1.5} />
              </span>
              <div>
                <h3 className="font-sans text-base font-bold">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TextImage({ title, data, banner }: { title: string | null; data: Record<string, unknown>; banner?: boolean }) {
  const link = data.link as LinkData | undefined;
  const image = typeof data.image_url === "string" && data.image_url ? data.image_url : null;
  if (banner) {
    return (
      <section className="container-page">
        <div className="relative isolate overflow-hidden rounded-2xl bg-ink text-cream">
          {image && <StoreImage src={image} alt={(data.image_alt as string) ?? ""} fill sizes="100vw" className="-z-10 object-cover opacity-45" />}
          <div className="max-w-xl px-6 py-14 sm:px-12 lg:py-20">
            {title && <h2 className="text-3xl font-bold lg:text-4xl">{title}</h2>}
            {typeof data.text === "string" && data.text && <p className="mt-3 text-lg text-cream/85">{data.text}</p>}
            {link?.label && (
              <Link href={safeInternalPath(link.href, "/shop")} className={buttonClass("outline", "lg", "mt-7 border-cream/60 text-cream hover:bg-cream hover:text-ink")}>
                {link.label}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="container-page">
      <div className={cn("grid items-center gap-8 lg:grid-cols-2 lg:gap-16", data.image_side === "end" && "lg:[&>*:first-child]:order-last")}>
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand">
          {image && <StoreImage src={image} alt={(data.image_alt as string) ?? ""} fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />}
        </div>
        <div>
          {title && <h2 className="text-3xl font-bold tracking-tight">{title}</h2>}
          {typeof data.text === "string" && data.text && <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-ink-soft">{data.text}</p>}
          {link?.label && (
            <Link href={safeInternalPath(link.href, "/shop")} className={buttonClass("primary", "lg", "mt-7")}>
              {link.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

function Newsletter({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  return (
    <section className="container-page">
      <div className="rounded-2xl bg-brand px-6 py-12 text-center text-cream sm:px-12 lg:py-16">
        <h2 className="text-2xl font-bold lg:text-3xl">{title}</h2>
        {typeof data.text === "string" && <p className="mx-auto mt-3 max-w-md text-cream/85">{data.text}</p>}
        <NewsletterForm />
      </div>
    </section>
  );
}

export function HomeSections({ sections }: { sections: PageSection[] }) {
  return (
    <div className="space-y-16 lg:space-y-24">
      {sections.map((s) => {
        const wrap = (node: React.ReactNode) => (
          <div key={s.id} className={cn(s.kind !== "hero" && "reveal", s.hide_on_mobile && "max-md:hidden")}>
            {node}
          </div>
        );
        switch (s.kind) {
          case "hero":
            return wrap(<Hero data={s.data} />);
          case "categories":
            return wrap(<Categories title={s.title} />);
          case "product_grid":
            return wrap(<ProductsSection title={s.title} data={s.data} />);
          case "rooms":
            return wrap(<Rooms title={s.title} data={s.data} />);
          case "collections":
            return wrap(<Collections title={s.title} />);
          case "benefits":
            return wrap(<Benefits title={s.title} data={s.data} />);
          case "text_image":
            return wrap(<TextImage title={s.title} data={s.data} />);
          case "banner":
            return wrap(<TextImage title={s.title} data={s.data} banner />);
          case "newsletter":
            return wrap(<Newsletter title={s.title} data={s.data} />);
          default:
            return null; // Section kinds added in later stages render nothing yet.
        }
      })}
    </div>
  );
}
