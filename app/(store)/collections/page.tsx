import type { Metadata } from "next";
import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import { PageHeader } from "@/components/store/page-header";
import { getCollections } from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: "קולקציות",
  description: "קולקציות נבחרות לפי סגנון, עונה ותקציב.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <>
      <PageHeader title="קולקציות" description="מוצרים שנבחרו יחד, לפי סגנון, עונה ותקציב." crumbs={[{ name: "קולקציות", href: "/collections" }]} />
      <ul className="container-page grid gap-6 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {collections.map((c) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
                <StoreImage src={c.image_url} alt="" fill sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <h2 className="mt-4 text-xl font-bold group-hover:text-brand">{c.name}</h2>
              {c.description && <p className="mt-1 text-ink-soft">{c.description}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
