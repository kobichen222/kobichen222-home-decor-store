import type { Metadata } from "next";
import { redirectOrNotFound } from "@/lib/redirects";
import { Suspense } from "react";
import { Listing, ListingSkeleton } from "@/components/store/listing";
import { PageHeader } from "@/components/store/page-header";
import { isIndexableListing, parseListingParams } from "@/features/catalog/params";
import { getCollections } from "@/features/catalog/queries";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params, searchParams }: PageProps<"/collections/[slug]">): Promise<Metadata> {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const collection = (await getCollections()).find((c) => c.slug === slug);
  if (!collection) return {};
  return {
    title: collection.seo_title ?? collection.name,
    description: collection.seo_description ?? collection.description ?? undefined,
    alternates: { canonical: `/collections/${collection.slug}` },
    robots: isIndexableListing(parseListingParams(sp)) ? undefined : { index: false, follow: true },
  };
}

async function CollectionContent({ params, searchParams }: PageProps<"/collections/[slug]">) {
  const { slug } = await params;
  const collection = (await getCollections()).find((c) => c.slug === slug);
  if (!collection) return redirectOrNotFound(`/collections/${slug}`);
  return (
    <>
      <PageHeader
        title={collection.name}
        description={collection.description}
        crumbs={[
          { name: "קולקציות", href: "/collections" },
          { name: collection.name, href: `/collections/${collection.slug}` },
        ]}
      />
      <div className="container-page py-10">
        <Suspense fallback={<ListingSkeleton />}>
          <Listing basePath={`/collections/${collection.slug}`} scope={{ collectionId: collection.id }} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}

export default function CollectionPage(props: PageProps<"/collections/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-10"><ListingSkeleton /></div>}>
      <CollectionContent {...props} />
    </Suspense>
  );
}
