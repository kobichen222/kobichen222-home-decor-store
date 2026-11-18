import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import { getFacets, searchProducts } from "@/features/catalog/queries";
import { createServiceClient } from "@/lib/supabase/service";
import { hasActiveFilters, listingQuery, parseListingParams, type RawSearchParams } from "@/features/catalog/params";
import { PAGE_SIZE } from "@/features/catalog/types";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FilterSidebar, MobileFilters, SortSelect } from "./filter-form";
import { ProductGrid } from "./product-card";

export function ListingSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i}>
          <div className="aspect-[4/5] animate-pulse rounded-xl bg-sand" />
          <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-sand" />
          <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-sand" />
        </div>
      ))}
    </div>
  );
}

function Pagination({ basePath, filters, total }: { basePath: string; filters: ReturnType<typeof parseListingParams>; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const href = (page: number) => basePath + listingQuery(filters, { page });
  const window = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pages || Math.abs(p - filters.page) <= 1,
  );
  return (
    <nav aria-label="ניווט בין עמודים" className="mt-14 flex items-center justify-center gap-1.5">
      {filters.page > 1 && (
        <Link href={href(filters.page - 1)} className={buttonClass("ghost", "sm", "px-2.5")} aria-label="העמוד הקודם" rel="prev">
          <ChevronRight className="size-4" />
        </Link>
      )}
      {window.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && p - window[i - 1] > 1 && <span className="px-1 text-ink-soft">…</span>}
          <Link
            href={href(p)}
            aria-current={p === filters.page ? "page" : undefined}
            className={cn(
              "grid size-9 place-items-center rounded-full text-sm font-semibold tabular-nums",
              p === filters.page ? "bg-ink text-cream" : "hover:bg-sand",
            )}
          >
            {p}
          </Link>
        </span>
      ))}
      {filters.page < pages && (
        <Link href={href(filters.page + 1)} className={buttonClass("ghost", "sm", "px-2.5")} aria-label="העמוד הבא" rel="next">
          <ChevronLeft className="size-4" />
        </Link>
      )}
    </nav>
  );
}

export async function Listing({
  basePath,
  scope,
  searchParams,
}: {
  basePath: string;
  scope: { categoryId?: string; collectionId?: string };
  searchParams: Promise<RawSearchParams>;
}) {
  const filters = parseListingParams(await searchParams);
  const [facets, { items, total }] = await Promise.all([
    getFacets({ ...scope, q: filters.q }),
    searchProducts({ ...scope, ...filters }),
  ]);
  // Search terms feed "popular searches" (first page of a plain search only).
  if (filters.q && filters.page === 1 && !scope.categoryId && !scope.collectionId) {
    const q = filters.q.toLowerCase().slice(0, 60);
    after(async () => {
      await createServiceClient().from("search_log").insert({ q, results: total });
    });
  }
  const activeCount =
    filters.valueIds.length + Number(filters.minPrice !== null || filters.maxPrice !== null) + Number(filters.onSale) + Number(filters.inStock);

  return (
    <div className="flex gap-12">
      <FilterSidebar action={basePath} facets={facets} current={filters} activeCount={activeCount} />
      <div className="min-w-0 flex-1">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MobileFilters action={basePath} facets={facets} current={filters} activeCount={activeCount} />
            <p className="text-sm text-ink-soft" role="status">
              {total} מוצרים
            </p>
          </div>
          <SortSelect action={basePath} current={filters} />
        </div>
        {items.length > 0 ? (
          <ProductGrid products={items} priorityCount={4} />
        ) : (
          <div className="rounded-2xl bg-sand px-6 py-20 text-center">
            <p className="font-display text-xl font-semibold">לא נמצאו מוצרים מתאימים</p>
            <p className="mt-2 text-ink-soft">
              {hasActiveFilters(filters) ? "נסו להסיר חלק מהסינונים." : "נסו חיפוש אחר או עיינו בכל המוצרים."}
            </p>
            <Link href={hasActiveFilters(filters) ? basePath : "/shop"} className={buttonClass("outline", "md", "mt-6")}>
              {hasActiveFilters(filters) ? "ניקוי הסינון" : "לכל המוצרים"}
            </Link>
          </div>
        )}
        <Pagination basePath={basePath} filters={filters} total={total} />
      </div>
    </div>
  );
}
