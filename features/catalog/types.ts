export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  is_featured: boolean;
  price: number;
  regular_price: number;
  discount_percent: number;
  in_stock: boolean;
  purchasable: boolean;
  variant_count: number;
  price_varies: boolean;
  image_url: string | null;
  image_alt: string | null;
  hover_image_url: string | null;
};

export type Category = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  banner_url: string | null;
  sort_order: number;
  show_on_home: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

export type Collection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
};

export type Facets = {
  price_min: number | null;
  price_max: number | null;
  on_sale_count: number;
  attributes: {
    id: string;
    code: string;
    name: string;
    kind: "select" | "color";
    values: { id: string; value: string; color_hex: string | null; count: number }[];
  }[];
};

export type SortKey = "featured" | "price_asc" | "price_desc" | "newest" | "bestsellers" | "discount";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "featured", label: "מומלצים" },
  { value: "price_asc", label: "מחיר: מהנמוך לגבוה" },
  { value: "price_desc", label: "מחיר: מהגבוה לנמוך" },
  { value: "newest", label: "החדשים ביותר" },
  { value: "bestsellers", label: "הנמכרים ביותר" },
  { value: "discount", label: "הנחות מובילות" },
];

export type ListingFilters = {
  categoryId?: string | null;
  collectionId?: string | null;
  q?: string | null;
  valueIds?: string[];
  minPrice?: number | null;
  maxPrice?: number | null;
  onSale?: boolean;
  inStock?: boolean;
  sort?: SortKey;
  page?: number;
};

export type ProductVariant = {
  id: string;
  sku: string;
  name: string | null;
  options: Record<string, string>;
  is_default: boolean;
  image_id: string | null;
  lead_time_days: number | null;
  regular_price: number;
  price: number;
  available: number;
  in_stock: boolean;
  allow_backorder: boolean;
  low_stock: boolean;
};

export type ProductImage = { id: string; url: string; alt: string | null; is_primary: boolean };
export type ProductVideo = { id: string; kind: "file" | "youtube"; url: string; title: string | null; created_at: string };

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  brand: { name: string; slug: string } | null;
  specs: { label: string; value: string }[];
  width_cm: number | null;
  height_cm: number | null;
  depth_cm: number | null;
  weight_kg: number | null;
  installation_instructions: string | null;
  care_instructions: string | null;
  delivery_days_min: number | null;
  delivery_days_max: number | null;
  video_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image_url: string | null;
  noindex: boolean;
  images: ProductImage[];
  videos: ProductVideo[];
  variants: ProductVariant[];
  categories: { name: string; slug: string; is_primary: boolean }[];
  colorHex: Record<string, string>;
};

export const PAGE_SIZE = 12;
