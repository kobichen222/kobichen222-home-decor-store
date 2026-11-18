import { NextResponse } from "next/server";
import { can, getAdmin, type Permission } from "@/lib/auth/admin";
import { toCsv } from "@/lib/csv";
import { createSessionClient } from "@/lib/supabase/server";

// CSV exports. Each kind requires its own permission; data is read as the
// signed-in admin, so RLS applies as well.
const KINDS: Record<string, Permission[]> = {
  products: ["catalog.manage"],
  inventory: ["inventory.manage"],
  orders: ["orders.view"],
  customers: ["customers.view"],
};

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!KINDS[kind] || !can(admin, ...KINDS[kind])) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const db = await createSessionClient();
  const url = new URL(request.url);
  let csv = "";

  if (kind === "products") {
    const { data } = await db
      .from("products")
      .select("sku, name, price, sale_price, status, slug, short_description, description, categories:product_categories(is_primary, category:categories(slug)), variants:product_variants(is_default, inventory(on_hand))")
      .neq("status", "archived")
      .order("sku");
    csv = toCsv(
      ["sku", "name", "price", "sale_price", "stock", "category", "status", "slug", "short_description", "description"],
      (data ?? []).map((p) => [
        p.sku, p.name, p.price, p.sale_price,
        (p.variants.find((v) => v.is_default) ?? p.variants[0])?.inventory?.on_hand ?? 0,
        (p.categories.find((c) => c.is_primary) ?? p.categories[0])?.category?.slug ?? "",
        p.status, p.slug, p.short_description, p.description,
      ]),
    );
  } else if (kind === "inventory") {
    const { data } = await db.from("product_variants").select("sku, name, product:products(name), inventory(on_hand, reserved, low_stock_threshold)").order("sku");
    csv = toCsv(["sku", "product", "variant", "on_hand", "reserved", "available", "low_stock_threshold"], (data ?? []).map((v) => [v.sku, v.product?.name, v.name, v.inventory?.on_hand, v.inventory?.reserved, (v.inventory?.on_hand ?? 0) - (v.inventory?.reserved ?? 0), v.inventory?.low_stock_threshold]));
  } else if (kind === "orders") {
    const from = url.searchParams.get("from");
    let q = db.from("orders").select("order_number, placed_at, paid_at, status, payment_status, customer_name, customer_email, customer_phone, customer_type, company_name, company_number, shipping_method_name, subtotal, discount_total, shipping_total, total, vat_amount, coupon_code, promotion_name, tracking_number").order("placed_at", { ascending: false }).limit(20000);
    if (from && /^\d{4}-\d\d-\d\d$/.test(from)) q = q.gte("placed_at", from);
    const { data } = await q;
    const cols = ["order_number", "placed_at", "paid_at", "status", "payment_status", "customer_name", "customer_email", "customer_phone", "customer_type", "company_name", "company_number", "shipping_method_name", "subtotal", "discount_total", "shipping_total", "total", "vat_amount", "coupon_code", "promotion_name", "tracking_number"] as const;
    csv = toCsv([...cols], (data ?? []).map((o) => cols.map((c) => o[c])));
  } else {
    const { data } = await db.rpc("admin_customers", { p_segment: "all", p_limit: 200, p_offset: 0 });
    const items = ((data as unknown as { items: Record<string, unknown>[] })?.items ?? []);
    const cols = ["email", "name", "phone", "orders", "total_spent", "last_order_at", "is_business", "subscribed"];
    csv = toCsv(cols, items.map((c) => cols.map((k) => c[k] as string)));
  }
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
