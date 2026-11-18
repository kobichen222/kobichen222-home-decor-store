import type { Metadata } from "next";
import { redirectOrNotFound } from "@/lib/redirects";
import { Suspense } from "react";
import { Breadcrumbs, JsonLd } from "@/components/store/page-header";
import { ProductGrid } from "@/components/store/product-card";
import { ProductView } from "@/components/store/product-view";
import { ProductReviews } from "@/components/store/reviews";
import { getProductReviews } from "@/features/catalog/reviews";
import { getAllProductSlugs, getProductBySlug, getRelatedProducts } from "@/features/catalog/queries";
import type { ProductDetail } from "@/features/catalog/types";
import { siteUrl } from "@/lib/env";

export async function generateStaticParams() {
  // Prerender the best sellers at build time; the rest render on first visit.
  return (await getAllProductSlugs()).slice(0, 50).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/product/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const title = product.seo_title ?? product.name;
  const description = product.seo_description ?? product.short_description ?? undefined;
  const image = product.og_image_url ?? product.images[0]?.url;
  return {
    title,
    description,
    alternates: { canonical: `/product/${product.slug}` },
    robots: product.noindex ? { index: false, follow: true } : undefined,
    openGraph: { title, description, type: "website", images: image ? [image] : undefined },
  };
}

function Details({ summary, open, children }: { summary: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details open={open} className="group border-b border-line">
      <summary className="flex list-none items-center justify-between py-4 font-display text-[1.05rem] font-semibold marker:hidden [&::-webkit-details-marker]:hidden">
        {summary}
        <span className="text-xl font-normal text-ink-soft transition-transform group-open:rotate-45" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="space-y-3 pb-5 leading-relaxed text-ink-soft">{children}</div>
    </details>
  );
}

function ProductInfo({ product }: { product: ProductDetail }) {
  const dimensions = [
    ["רוחב", product.width_cm, "ס״מ"],
    ["גובה", product.height_cm, "ס״מ"],
    ["עומק", product.depth_cm, "ס״מ"],
    ["משקל", product.weight_kg, "ק״ג"],
  ].filter(([, value]) => value !== null) as [string, number, string][];
  return (
    <div className="mt-9 border-t border-line">
      {product.description && (
        <Details summary="תיאור המוצר" open>
          {product.description.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Details>
      )}
      {(product.specs.length > 0 || dimensions.length > 0) && (
        <Details summary="מפרט ומידות">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            {dimensions.map(([label, value, unit]) => (
              <div key={label} className="contents">
                <dt className="font-semibold text-ink">{label}</dt>
                <dd>
                  {value} {unit}
                </dd>
              </div>
            ))}
            {product.specs.map((s) => (
              <div key={s.label} className="contents">
                <dt className="font-semibold text-ink">{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </Details>
      )}
      {product.installation_instructions && <Details summary="הוראות התקנה">{product.installation_instructions}</Details>}
      {product.care_instructions && <Details summary="תחזוקה וניקוי">{product.care_instructions}</Details>}
      <Details summary="משלוחים, החזרות ואחריות">
        <p>
          אספקה תוך {product.delivery_days_min ?? 3}–{product.delivery_days_max ?? 7} ימי עסקים לכל הארץ, או איסוף עצמי בתיאום מראש.
        </p>
        <p>ניתן להחזיר את המוצר באריזתו המקורית בתוך 14 יום מקבלתו, בהתאם למדיניות ההחזרות.</p>
        <p>האחריות למוצר היא 12 חודשים מיום הרכישה.</p>
      </Details>
    </div>
  );
}

async function Related({ productId, categorySlug }: { productId: string; categorySlug: string | null }) {
  const products = await getRelatedProducts(productId, categorySlug);
  if (!products.length) return null;
  return (
    <section className="mt-20">
      <h2 className="mb-8 text-2xl font-bold tracking-tight lg:text-[2rem]">מוצרים משלימים</h2>
      <ProductGrid products={products} />
    </section>
  );
}

async function ProductContent({ params }: Pick<PageProps<"/product/[slug]">, "params">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return redirectOrNotFound(`/product/${slug}`);

  const primary = product.categories.find((c) => c.is_primary) ?? product.categories[0] ?? null;
  const feedback = await getProductReviews(product.id);
  const url = `${siteUrl()}/product/${product.slug}`;
  const absolute = (path: string) => (path.startsWith("http") ? path : siteUrl() + path);
  const prices = product.variants.map((v) => v.price);
  const inStock = product.variants.some((v) => v.in_stock);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    sku: product.sku,
    description: product.short_description ?? undefined,
    image: product.images.map((i) => absolute(i.url)),
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    aggregateRating:
      feedback.count > 0 ? { "@type": "AggregateRating", ratingValue: feedback.average, reviewCount: feedback.count } : undefined,
    review: feedback.reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      author: { "@type": "Person", name: r.author_name },
      datePublished: r.created_at.slice(0, 10),
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.body ?? undefined,
    })),
    video: product.videos.length
      ? product.videos.map((v) => ({
          "@type": "VideoObject",
          name: v.title ?? product.name,
          description: product.short_description ?? product.name,
          uploadDate: v.created_at,
          thumbnailUrl: v.kind === "youtube" ? `https://i.ytimg.com/vi/${v.url}/hqdefault.jpg` : absolute(product.images[0]?.url ?? "/"),
          ...(v.kind === "youtube" ? { embedUrl: `https://www.youtube-nocookie.com/embed/${v.url}` } : { contentUrl: v.url }),
        }))
      : undefined,
    offers: {
      "@type": prices.length > 1 ? "AggregateOffer" : "Offer",
      url,
      priceCurrency: "ILS",
      ...(prices.length > 1
        ? { lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length }
        : { price: prices[0] }),
      availability: inStock
        ? "https://schema.org/InStock"
        : product.variants.some((v) => v.allow_backorder)
          ? "https://schema.org/PreOrder"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-page py-6 lg:py-10">
      <JsonLd data={jsonLd} />
      <Breadcrumbs
        items={[
          ...(primary ? [{ name: primary.name, href: `/category/${primary.slug}` }] : []),
          { name: product.name, href: `/product/${product.slug}` },
        ]}
      />
      <div className="mt-6">
        <ProductView product={product} rating={{ average: feedback.average, count: feedback.count }}>
          <ProductInfo product={product} />
        </ProductView>
      </div>
      <ProductReviews productId={product.id} {...feedback} />
      <Suspense fallback={null}>
        <Related productId={product.id} categorySlug={primary?.slug ?? null} />
      </Suspense>
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14" aria-hidden="true">
      <div className="aspect-[4/5] animate-pulse rounded-2xl bg-sand" />
      <div className="space-y-4 pt-4">
        <div className="h-9 w-3/4 animate-pulse rounded bg-sand" />
        <div className="h-8 w-1/4 animate-pulse rounded bg-sand" />
        <div className="h-24 animate-pulse rounded bg-sand" />
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/product/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}
