import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { siteUrl } from "@/lib/env";

export type Crumb = { name: string; href: string };

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "דף הבית", href: "/" }, ...items];
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: siteUrl() + c.href })),
        }}
      />
      <nav aria-label="פירורי לחם" className="text-sm text-ink-soft">
        <ol className="flex flex-wrap items-center gap-1">
          {all.map((c, i) => (
            <li key={c.href} className="flex items-center gap-1">
              {i > 0 && <ChevronLeft className="size-3.5" aria-hidden="true" />}
              {i === all.length - 1 ? (
                <span aria-current="page" className="text-ink">
                  {c.name}
                </span>
              ) : (
                <Link href={c.href} className="hover:text-brand">
                  {c.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export function PageHeader({ title, description, crumbs }: { title: string; description?: string | null; crumbs: Crumb[] }) {
  return (
    <div className="border-b border-line bg-sand/60">
      <div className="container-page py-8 lg:py-12">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-4 text-3xl font-bold tracking-tight lg:text-[2.6rem]">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-lg text-ink-soft">{description}</p>}
      </div>
    </div>
  );
}
