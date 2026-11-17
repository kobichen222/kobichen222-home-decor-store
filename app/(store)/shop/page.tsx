import type { Metadata } from "next";
import { Suspense } from "react";
import { Listing, ListingSkeleton } from "@/components/store/listing";
import { PageHeader } from "@/components/store/page-header";
import { isIndexableListing, parseListingParams } from "@/features/catalog/params";

export async function generateMetadata({ searchParams }: PageProps<"/shop">): Promise<Metadata> {
  const filters = parseListingParams(await searchParams);
  return {
    title: filters.q ? `תוצאות חיפוש: ${filters.q}` : "כל המוצרים",
    description: "כל מוצרי העיצוב לבית, למשרד ולעסק במקום אחד.",
    alternates: { canonical: "/shop" },
    robots: isIndexableListing(filters) ? undefined : { index: false, follow: true },
  };
}

async function Title({ searchParams }: Pick<PageProps<"/shop">, "searchParams">) {
  const { q } = parseListingParams(await searchParams);
  return (
    <PageHeader
      title={q ? `תוצאות חיפוש עבור ״${q}״` : "כל המוצרים"}
      crumbs={[{ name: "כל המוצרים", href: "/shop" }]}
    />
  );
}

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <Suspense fallback={<PageHeader title="כל המוצרים" crumbs={[{ name: "כל המוצרים", href: "/shop" }]} />}>
        <Title searchParams={searchParams} />
      </Suspense>
      <div className="container-page py-10">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing basePath="/shop" scope={{}} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
