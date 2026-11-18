export type CartItem = {
  item_id: string;
  variant_id: string;
  product_id: string;
  name: string;
  slug: string;
  variant_name: string | null;
  options: Record<string, string>;
  sku: string;
  image_url: string | null;
  quantity: number;
  unit_price: number | null;
  regular_price: number | null;
  line_total: number;
  available: number;
  allow_backorder: boolean;
  purchasable: boolean;
};

export type CartSummary = {
  cart_id: string | null;
  items: CartItem[];
  item_count: number;
  subtotal: number;
  discount: number;
  promotion: { name: string; discount: number } | null;
  coupon_discount: number;
  coupon: { code: string; valid: boolean; message?: string; kind?: string; description?: string | null } | null;
  shipping: number;
  shipping_method: { id: string; name: string; kind: string; requires_address: boolean } | null;
  total: number;
  vat_rate: number;
  vat_amount: number;
};

export const EMPTY_CART: CartSummary = {
  cart_id: null,
  items: [],
  item_count: 0,
  subtotal: 0,
  discount: 0,
  promotion: null,
  coupon_discount: 0,
  coupon: null,
  shipping: 0,
  shipping_method: null,
  total: 0,
  vat_rate: 18,
  vat_amount: 0,
};

export type CartActionResult = { ok: boolean; error?: string; cart: CartSummary };
