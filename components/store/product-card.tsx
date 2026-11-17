import Link from "next/link";
import { StoreImage } from "@/components/shared/store-image";
import type { ProductCard as ProductCardData } from "@/features/catalog/types";
import { formatPrice } from "@/lib/utils";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const onSale = product.discount_percent > 0;
  return (
    <article className="group relative flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
        <StoreImage
          src={product.image_url}
          alt={product.image_alt ?? product.name}
          fill
          priority={priority}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-[transform,opacity] duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
        />
        {product.hover_image_url && (
          <StoreImage
            src={product.hover_image_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100 max-md:hidden"
          />
        )}
        <div className="absolute start-3 top-3 flex flex-col items-start gap-1.5">
          {onSale && (
            <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-cream">−{product.discount_percent}%</span>
          )}
          {!product.purchasable && (
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink-soft">אזל מהמלאי</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 pt-3.5">
        <h3 className="font-sans text-[0.98rem] font-semibold leading-snug">
          <Link href={`/product/${product.slug}`} className="after:absolute after:inset-0 hover:text-brand">
            {product.name}
          </Link>
        </h3>
        <p className="flex flex-wrap items-baseline gap-x-2 text-[0.95rem]">
          {product.price_varies && <span className="text-xs text-ink-soft">החל מ־</span>}
          <span className="font-bold tabular-nums">{formatPrice(product.price)}</span>
          {onSale && <s className="text-sm text-ink-soft tabular-nums">{formatPrice(product.regular_price)}</s>}
        </p>
      </div>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: ProductCardData[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
