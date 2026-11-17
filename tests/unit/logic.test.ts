import { describe, expect, it } from "vitest";
import { isIndexableListing, listingQuery, parseListingParams } from "@/features/catalog/params";
import { sign, verifySignature } from "@/lib/payments/signature";
import { safeInternalPath } from "@/lib/utils";
import { checkoutSchema } from "@/lib/validations/checkout";
import { parseOptions, productSchema } from "@/lib/validations/product";

const ID = "3f2b8c1e-5a4d-4e6f-9a7b-1c2d3e4f5a6b";

describe("listing params", () => {
  it("drops anything that is not a valid filter", () => {
    const f = parseListingParams({ f: ["not-a-uuid", ID, ID], min: "-5", max: "abc", sort: "'; drop table", page: "-3", q: " x ".repeat(100) });
    expect(f.valueIds).toEqual([ID]);
    expect(f.minPrice).toBeNull();
    expect(f.maxPrice).toBeNull();
    expect(f.sort).toBe("featured");
    expect(f.page).toBe(1);
    expect(f.q!.length).toBeLessThanOrEqual(100);
  });
  it("only the bare listing is indexable", () => {
    expect(isIndexableListing(parseListingParams({}))).toBe(true);
    for (const sp of [{ f: ID }, { sort: "price_asc" }, { page: "2" }, { sale: "1" }, { q: "שעון" }, { min: "10" }]) {
      expect(isIndexableListing(parseListingParams(sp))).toBe(false);
    }
  });
  it("round-trips through the query string", () => {
    const f = parseListingParams({ f: ID, min: "100", sale: "1", sort: "newest", page: "3", q: "שעון קיר" });
    const again = parseListingParams(Object.fromEntries(new URLSearchParams(listingQuery(f).slice(1))));
    expect(again).toEqual(f);
  });
});

describe("webhook signature", () => {
  const body = JSON.stringify({ order_id: ID, amount: 100 });
  it("accepts the right signature and rejects everything else", () => {
    expect(verifySignature(body, sign(body, "secret"), "secret")).toBe(true);
    expect(verifySignature(body, sign(body, "other"), "secret")).toBe(false);
    expect(verifySignature(body.replace("100", "1"), sign(body, "secret"), "secret")).toBe(false);
    expect(verifySignature(body, null, "secret")).toBe(false);
    expect(verifySignature(body, "zz", "secret")).toBe(false);
  });
});

describe("redirect targets", () => {
  it("allows only same-site paths", () => {
    expect(safeInternalPath("/shop?sale=1")).toBe("/shop?sale=1");
    for (const bad of ["https://evil.example", "//evil.example", "javascript:alert(1)", "/\\evil.example", null]) {
      expect(safeInternalPath(bad, "/shop")).toBe("/shop");
    }
  });
});

describe("checkout validation", () => {
  const base = { name: "ישראל ישראלי", phone: "050-123 4567", email: "a@b.co.il", customer_type: "private", shipping_method_id: ID, requires_address: true, city: "חיפה", street: "הנמל", house_number: "3", terms: true };
  it("accepts a valid order and normalises the phone", () => {
    const r = checkoutSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data!.phone).toBe("0501234567");
  });
  it("requires an address only when the shipping method needs one", () => {
    expect(checkoutSchema.safeParse({ ...base, city: "" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, city: "", street: "", house_number: "", requires_address: false }).success).toBe(true);
  });
  it("rejects bad phone, missing terms and business without a company", () => {
    expect(checkoutSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, terms: false }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, customer_type: "business" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, customer_type: "business", company_name: "סטודיו בע״מ", company_number: "512345678" }).success).toBe(true);
  });
});

describe("product validation", () => {
  const variant = { id: null, sku: "A-1", name: "", options: {}, price: "", sale_price: "", on_hand: 5, low_stock_threshold: 2, allow_backorder: false, is_default: true, is_active: true };
  const base = { name: "אגרטל", slug: "vase", sku: "A", status: "draft", is_featured: false, price: "100", sale_price: "", cost_price: "", sale_starts_at: "", sale_ends_at: "", specs: [], noindex: false, category_ids: [], primary_category_id: "", attribute_value_ids: [], variants: [variant], brand_id: "" };
  it("accepts a minimal product and turns empty fields into nulls", () => {
    const r = productSchema.safeParse(base);
    expect(r.success).toBe(true);
    expect(r.data!.sale_price).toBeNull();
    expect(r.data!.variants[0].price).toBeNull();
  });
  it("rejects a sale price that is not lower, bad slugs and duplicate SKUs", () => {
    expect(productSchema.safeParse({ ...base, sale_price: "100" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, slug: "אגרטל יפה" }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, variants: [variant, variant] }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, variants: [] }).success).toBe(false);
  });
  it("parses variant options text", () => {
    expect(parseOptions("צבע: שחור, מידה: 60×90")).toEqual({ צבע: "שחור", מידה: "60×90" });
    expect(parseOptions("garbage")).toEqual({});
  });
});
