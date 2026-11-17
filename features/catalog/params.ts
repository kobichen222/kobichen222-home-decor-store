import type { ListingFilters, SortKey } from "./types";
import { SORT_OPTIONS } from "./types";

export type RawSearchParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const list = (v: string | string[] | undefined) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

function price(v: string | string[] | undefined): number | null {
  const n = Number(first(v));
  return first(v) && Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null;
}

/** Untrusted URL query → validated listing filters. Unknown input is dropped. */
export function parseListingParams(sp: RawSearchParams): Required<Omit<ListingFilters, "categoryId" | "collectionId">> {
  const sort = SORT_OPTIONS.find((o) => o.value === first(sp.sort))?.value ?? ("featured" as SortKey);
  const page = Math.floor(Number(first(sp.page)));
  return {
    q: (first(sp.q) ?? "").trim().slice(0, 100) || null,
    valueIds: [...new Set(list(sp.f).filter((id) => UUID.test(id)))].sort().slice(0, 30),
    minPrice: price(sp.min),
    maxPrice: price(sp.max),
    onSale: first(sp.sale) === "1",
    inStock: first(sp.stock) === "1",
    sort,
    page: Number.isFinite(page) && page > 0 && page < 1000 ? page : 1,
  };
}

export function hasActiveFilters(f: ReturnType<typeof parseListingParams>): boolean {
  return f.valueIds.length > 0 || f.minPrice !== null || f.maxPrice !== null || f.onSale || f.inStock;
}

/** Filtered, sorted and paged variants of a listing must not be indexed. */
export function isIndexableListing(f: ReturnType<typeof parseListingParams>): boolean {
  return !hasActiveFilters(f) && f.sort === "featured" && f.page === 1 && !f.q;
}

export function listingQuery(f: ReturnType<typeof parseListingParams>, overrides: { page?: number } = {}): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  for (const id of f.valueIds) p.append("f", id);
  if (f.minPrice !== null) p.set("min", String(f.minPrice));
  if (f.maxPrice !== null) p.set("max", String(f.maxPrice));
  if (f.onSale) p.set("sale", "1");
  if (f.inStock) p.set("stock", "1");
  if (f.sort !== "featured") p.set("sort", f.sort);
  const page = overrides.page ?? f.page;
  if (page > 1) p.set("page", String(page));
  const s = p.toString();
  return s ? `?${s}` : "";
}
