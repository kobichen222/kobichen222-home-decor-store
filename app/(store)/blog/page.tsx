import type { Metadata } from "next";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { PageHeader } from "@/components/store/page-header";
import { getBlogPosts } from "@/features/cms/queries";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "בלוג והשראה",
  description: "מדריכים, רעיונות והשראה לעיצוב הבית, המשרד והעסק.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <>
      <PageHeader title="בלוג והשראה" description="מדריכים, רעיונות והשראה לעיצוב הבית, המשרד והעסק." crumbs={[{ name: "בלוג", href: "/blog" }]} />
      <div className="container-page py-10">
        {!posts.length ? (
          <p className="rounded-2xl bg-sand px-6 py-16 text-center text-ink-soft">מאמרים חדשים יעלו בקרוב.</p>
        ) : (
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((p) => (
              <li key={p.id}>
                <Link href={`/blog/${p.slug}`} className="group block">
                  <div className="relative aspect-[3/2] overflow-hidden rounded-xl bg-sand">
                    <StoreImage src={p.cover_image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <p className="mt-4 text-sm text-ink-soft">
                    {p.category?.name && `${p.category.name} · `}
                    {p.published_at && formatDate(p.published_at)}
                  </p>
                  <h2 className="mt-1 text-xl font-bold group-hover:text-brand">{p.title}</h2>
                  {p.excerpt && <p className="mt-2 line-clamp-3 text-ink-soft">{p.excerpt}</p>}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
