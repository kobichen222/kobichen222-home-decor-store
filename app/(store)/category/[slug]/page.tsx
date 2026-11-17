import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Listing, ListingSkeleton } from "@/components/store/listing";
import { PageHeader, type Crumb } from "@/components/store/page-header";
import { isIndexableListing, parseListingParams } from "@/features/catalog/params";
import { getCategories, getCategoryBySlug } from "@/features/catalog/queries";

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/category/[slug]">): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  const title = category.seo_title ?? category.name;
  const description = category.seo_description ?? category.description ?? `${category.name}: מוצרים נבחרים לעיצוב הבית, המשרד והעסק.`;
  return {
    title,
    description,
    alternates: { canonical: `/category/${category.slug}` },
    robots: isIndexableListing(parseListingParams(sp)) ? undefined : { index: false, follow: true },
    openGraph: { title, description, images: category.image_url ? [category.image_url] : undefined },
  };
}

async function CategoryContent({ params, searchParams }: PageProps<"/category/[slug]">) {
  const { slug } = await params;
  const [category, all] = await Promise.all([getCategoryBySlug(slug), getCategories()]);
  if (!category) notFound();
  const parent = all.find((c) => c.id === category.parent_id);
  const children = all.filter((c) => c.parent_id === category.id);
  const crumbs: Crumb[] = [
    ...(parent ? [{ name: parent.name, href: `/category/${parent.slug}` }] : []),
    { name: category.name, href: `/category/${category.slug}` },
  ];
  return (
    <>
      <PageHeader title={category.name} description={category.description} crumbs={crumbs} />
      <div className="container-page py-10">
        {children.length > 0 && (
          <ul className="no-scrollbar -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="תתי־קטגוריות">
            {children.map((c) => (
              <li key={c.id} className="shrink-0">
                <Link
                  href={`/category/${c.slug}`}
                  className="block rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold hover:border-brand hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Suspense fallback={<ListingSkeleton />}>
          <Listing basePath={`/category/${category.slug}`} scope={{ categoryId: category.id }} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

export default function CategoryPage(props: PageProps<"/category/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><ListingSkeleton /></div>}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
