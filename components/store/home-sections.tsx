import { ArrowLeft, Gem, Headset, ShieldCheck, Truck } from "lucide-react";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { buttonClass } from "@/components/ui/button";
import { getCategories, getCollections, getProductGrid } from "@/features/catalog/queries";
import type { PageSection } from "@/features/cms/queries";
import { cn, safeInternalPath } from "@/lib/utils";
import { NewsletterForm } from "./newsletter-form";
import { ProductGrid } from "./product-card";

type LinkData = { label?: string; href?: string };

function SectionHeading({ title, href, linkLabel = "לכל המוצרים" }: { title: string | null; href?: string; linkLabel?: string }) {
  if (!title) return null;
  return (
    <div className="mb-8 flex items-end justify-between gap-4 lg:mb-10">
      <h2 className="text-2xl font-bold tracking-tight lg:text-[2rem]">{title}</h2>
      {href && (
        <Link href={safeInternalPath(href, "/shop")} className="group flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand">
          {linkLabel}
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
        </Link>
      )}
    </div>
  );
}

function Hero({ data }: { data: Record<string, unknown> }) {
  const primary = data.primary as LinkData | undefined;
  const secondary = data.secondary as LinkData | undefined;
  return (
    <section className="relative isolate overflow-hidden bg-sand">
      <div className="absolute inset-0 -z-10">
        <StoreImage
          src={(data.image_url as string) ?? null}
          alt={(data.image_alt as string) ?? ""}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[35%_center] lg:object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-cream via-cream/55 to-transparent lg:bg-gradient-to-l lg:from-cream/95 lg:via-cream/60 lg:to-transparent" />
      </div>
      <div className="container-page flex min-h-[34rem] items-end pb-12 pt-40 lg:min-h-[40rem] lg:items-center lg:py-24">
        <div className="max-w-xl">
          {typeof data.eyebrow === "string" && (
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-brand">{data.eyebrow}</p>
          )}
          <h1 className="text-[2.4rem] font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.6rem]">{data.title as string}</h1>
          {typeof data.subtitle === "string" && <p className="mt-5 max-w-md text-lg text-ink-soft lg:text-xl">{data.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            {primary?.label && (
              <Link href={safeInternalPath(primary.href, "/shop")} className={buttonClass("primary", "lg")}>
                {primary.label}
              </Link>
            )}
            {secondary?.label && (
              <Link href={safeInternalPath(secondary.href, "/shop")} className={buttonClass("outline", "lg", "bg-cream/70")}>
                {secondary.label}
              </Link>
            )}
          </div>
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
      <SectionHeading title={title} />
      <ul className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-4 xl:grid-cols-6">
        {categories.map((c) => (
          <li key={c.id} className="w-[42%] shrink-0 snap-start sm:w-auto">
            <Link href={`/category/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
                <StoreImage
                  src={c.image_url}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 16vw, (min-width: 640px) 30vw, 42vw"
                  className="object-cover transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105"
                />
              </div>
              <p className="mt-3 text-center font-semibold group-hover:text-brand">{c.name}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function ProductsSection({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  const source = (["bestsellers", "newest", "sale", "featured"] as const).find((s) => s === data.source) ?? "featured";
  const products = await getProductGrid(source, Math.min(Number(data.limit) || 8, 12));
  if (!products.length) return null;
  return (
    <section className="container-page">
      <SectionHeading title={title} href={data.href as string | undefined} />
      <ProductGrid products={products} />
    </section>
  );
}

function Rooms({ title, data }: { title: string | null; data: Record<string, unknown> }) {
  const items = (data.items as LinkData[] | undefined) ?? [];
  return (
    <section className="bg-sand py-14 lg:py-20">
      <div className="container-page">
        <SectionHeading title={title} />
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={safeInternalPath(item.href, "/shop")}
                className="flex h-24 items-center justify-center rounded-xl border border-line bg-cream px-3 text-center font-display text-lg font-semibold transition-colors hover:border-brand hover:bg-brand hover:text-cream"
              >
                {item.label}
              </Link>
            </li>
          ))}
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
      <SectionHeading title={title} href="/collections" linkLabel="לכל הקולקציות" />
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
  return (
    <section className="container-page">
      <SectionHeading title={title} />
      <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Gem;
          return (
            <li key={item.title} className="border-t border-line pt-6">
              <Icon className="size-7 text-gold" strokeWidth={1.4} />
              <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{item.text}</p>
            </li>
          );
        })}
      </ul>
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
          <div key={s.id} className={cn(s.hide_on_mobile && "max-md:hidden")}>
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
          case "newsletter":
            return wrap(<Newsletter title={s.title} data={s.data} />);
          default:
            return null; // Section kinds added in later stages render nothing yet.
        }
      })}
    </div>
  );
}
