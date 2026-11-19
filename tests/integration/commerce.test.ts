import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";

// Runs against the local Supabase stack (`npx supabase start`) with the
// demo seed loaded. These are the money / stock / access guarantees.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SECRET_KEY!, opts);
const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opts);

const customer = { name: "בדיקה אוטומטית", email: "it@example.com", phone: "0500000000", type: "private" };
const address = { city: "תל אביב", street: "הבדיקה", house_number: "1" };
let methods: Record<string, string>;

async function variant(sku: string) {
  const { data } = await service.from("product_variants").select("id, product_id").eq("sku", sku).single();
  return data!;
}
async function stock(variantId: string) {
  const { data } = await service.from("inventory").select("on_hand, reserved").eq("variant_id", variantId).single();
  return data!;
}
async function cartWith(items: [string, number][], coupon?: string) {
  const { data: cart } = await service.from("carts").insert({ coupon_code: coupon ?? null }).select("id").single();
  for (const [variantId, quantity] of items) {
    await service.from("cart_items").insert({ cart_id: cart!.id, variant_id: variantId, quantity });
  }
  return cart!.id as string;
}
function order(cartId: string, email = customer.email, method = methods.home) {
  return service.rpc("create_order", { p_cart_id: cartId, p_customer: { ...customer, email }, p_address: address, p_shipping_method_id: method });
}

beforeAll(async () => {
  const { data, error } = await service.from("shipping_methods").select("id, code");
  if (error) throw new Error(`Local Supabase is not reachable: ${error.message}`);
  methods = Object.fromEntries(data!.map((m) => [m.code, m.id]));
});

describe("pricing is computed by the server", () => {
  it("prices variants, coupon, shipping threshold and VAT", async () => {
    const big = await variant("ART-1001-02"); // 189 + 90 = 279
    const cartId = await cartWith([[big.id, 2]], "SAVE50");
    const { data } = await service.rpc("cart_summary", { p_cart_id: cartId, p_shipping_method_id: methods.home });
    const s = data as Record<string, number>;
    expect(s.subtotal).toBe(558);
    expect(s.discount).toBe(50);
    expect(s.shipping).toBe(0); // 508 ≥ 499
    expect(s.total).toBe(508);
    expect(s.vat_amount).toBe(77.49); // 508 − 508/1.18

    const small = await variant("GFT-6001-01"); // 99
    const cheap = await cartWith([[small.id, 1]]);
    const { data: c } = await service.rpc("cart_summary", { p_cart_id: cheap, p_shipping_method_id: methods.home });
    expect((c as Record<string, number>).total).toBe(99 + 35);
  });

  it("uses the sale price and rejects an inapplicable coupon", async () => {
    const oak = await variant("CLK-2002-01"); // 179 → 149
    const cartId = await cartWith([[oak.id, 1]], "SAVE50"); // min order 400
    const { data } = await service.rpc("cart_summary", { p_cart_id: cartId });
    const s = data as { subtotal: number; discount: number; coupon: { valid: boolean } };
    expect(s.subtotal).toBe(149);
    expect(s.coupon.valid).toBe(false);
    expect(s.discount).toBe(0);
    const res = await order(cartId);
    expect(res.error?.message).toMatch(/^COUPON_INVALID/);
  });
});

describe("shipping zones", () => {
  it("adds the zone surcharge to home delivery, also when shipping is free, and charges it on the order", async () => {
    const { data: zone } = await service.from("shipping_zones").insert({ name: "בדיקת אזור", cities: ["עיר-בדיקה"], surcharge: 40 }).select("id").single();
    try {
      const big = await variant("ART-1001-03"); // above the free-shipping threshold
      const cartId = await cartWith([[big.id, 2]]);
      await service.from("carts").update({ shipping_city: " עיר בדיקה " }).eq("id", cartId);
      const { data } = await service.rpc("cart_summary", { p_cart_id: cartId, p_shipping_method_id: methods.home });
      const s = data as { shipping: number; zone_surcharge: number; zone_name: string; total: number; subtotal: number };
      expect(s.zone_surcharge).toBe(40);
      expect(s.zone_name).toBe("בדיקת אזור");
      expect(s.shipping).toBe(40); // free delivery + 40 surcharge
      expect(s.total).toBe(s.subtotal + 40);

      const { data: pickup } = await service.rpc("cart_summary", { p_cart_id: cartId, p_shipping_method_id: methods.pickup });
      expect((pickup as { zone_surcharge: number }).zone_surcharge).toBe(0);

      const res = await order(cartId);
      expect(res.error).toBeNull();
      const { data: o } = await service.from("orders").select("shipping_total, total").eq("id", (res.data as { order_id: string }).order_id).single();
      expect(Number(o!.shipping_total)).toBe(40);
      await service.rpc("fail_order_payment", { p_order_id: (res.data as { order_id: string }).order_id, p_provider: "test" });
    } finally {
      await service.from("shipping_zones").delete().eq("id", zone!.id);
    }
  });
});

describe("inventory can never be oversold", () => {
  it("lets exactly the available units through under concurrent checkouts", async () => {
    const oak = await variant("CLK-2002-01");
    await service.from("inventory").update({ on_hand: 2, reserved: 0 }).eq("variant_id", oak.id);
    const carts = await Promise.all(Array.from({ length: 8 }, () => cartWith([[oak.id, 1]])));
    const results = await Promise.all(carts.map((c) => order(c)));
    const ok = results.filter((r) => !r.error);
    const failed = results.filter((r) => r.error);
    expect(ok).toHaveLength(2);
    expect(failed).toHaveLength(6);
    for (const f of failed) expect(f.error!.message).toMatch(/^OUT_OF_STOCK/);
    expect(await stock(oak.id)).toEqual({ on_hand: 2, reserved: 2 });

    // A failed checkout left nothing behind (the whole order rolled back).
    const { count } = await service.from("orders").select("id", { count: "exact", head: true }).in("cart_id", carts).eq("status", "pending_payment");
    expect(count).toBe(2);

    // Expiry releases the stock again.
    await service.from("orders").update({ reservation_expires_at: new Date(Date.now() - 60_000).toISOString() }).in("cart_id", carts);
    const { data: released } = await service.rpc("release_expired_orders");
    expect(released).toBe(2);
    expect(await stock(oak.id)).toEqual({ on_hand: 2, reserved: 0 });
  });

  it("a second checkout of the same cart replaces the first reservation", async () => {
    const vase = await variant("DEC-5001-01");
    const before = await stock(vase.id);
    const cartId = await cartWith([[vase.id, 1]]);
    const first = await order(cartId);
    const second = await order(cartId);
    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect((await stock(vase.id)).reserved).toBe(before.reserved + 1);
    const { data: old } = await service.from("orders").select("status, cancel_reason").eq("id", (first.data as { order_id: string }).order_id).single();
    expect(old).toEqual({ status: "cancelled", cancel_reason: "superseded" });
    await service.rpc("fail_order_payment", { p_order_id: (second.data as { order_id: string }).order_id, p_provider: "test" });
    expect(await stock(vase.id)).toEqual(before);
  });
});

describe("payments are settled exactly once", () => {
  it("commits stock once, ignores replays, and refuses a wrong amount", async () => {
    const lamp = await variant("LMP-4003-01");
    const before = await stock(lamp.id);
    const cartId = await cartWith([[lamp.id, 1]]);
    const { data } = await order(cartId, "it@example.com", methods.pickup);
    const o = data as { order_id: string; total: number };

    const wrong = await service.rpc("confirm_order_payment", { p_order_id: o.order_id, p_provider: "test", p_provider_ref: "T-WRONG", p_amount: 1 });
    expect(wrong.error?.message).toBe("AMOUNT_MISMATCH");

    const ref = `T-${Date.now()}`;
    const pay = () => service.rpc("confirm_order_payment", { p_order_id: o.order_id, p_provider: "test", p_provider_ref: ref, p_amount: o.total });
    const [a, b, c] = await Promise.all([pay(), pay(), pay()]);
    const statuses = [a, b, c].map((r) => (r.data as { status: string })?.status).sort();
    expect(statuses).toEqual(["already_paid", "already_paid", "paid"]);

    expect(await stock(lamp.id)).toEqual({ on_hand: before.on_hand - 1, reserved: before.reserved });
    const { count } = await service.from("payments").select("id", { count: "exact", head: true }).eq("order_id", o.order_id).eq("status", "succeeded");
    expect(count).toBe(1);
    const { data: cart } = await service.from("carts").select("status").eq("id", cartId).single();
    expect(cart!.status).toBe("converted");

    // The same provider notification is registered only once.
    const eventId = `evt-${Date.now()}`;
    const reg = () => service.rpc("register_payment_event", { p_provider: "test", p_event_id: eventId, p_order_id: o.order_id, p_type: "succeeded", p_payload: {} });
    const flags = (await Promise.all([reg(), reg(), reg()])).map((r) => r.data);
    expect(flags.filter(Boolean)).toHaveLength(1);

    // One provider transaction cannot pay for a second order.
    const other = await order(await cartWith([[lamp.id, 1]]), "it@example.com", methods.pickup);
    const o2 = other.data as { order_id: string; total: number };
    const reuse = await service.rpc("confirm_order_payment", { p_order_id: o2.order_id, p_provider: "test", p_provider_ref: ref, p_amount: o2.total });
    expect(reuse.error?.message).toBe("PAYMENT_REFERENCE_REUSED");
    await service.rpc("fail_order_payment", { p_order_id: o2.order_id, p_provider: "test" });
  });

  it("enforces the per-customer coupon limit and restores it when payment fails", async () => {
    const candle = await variant("GFT-6001-01");
    const email = `c${Date.now()}@example.com`;
    const first = await order(await cartWith([[candle.id, 1]], "WELCOME10"), email, methods.pickup);
    expect(first.error).toBeNull();
    expect((first.data as { total: number }).total).toBe(89.1);
    const second = await order(await cartWith([[candle.id, 1]], "WELCOME10"), email, methods.pickup);
    expect(second.error?.message).toMatch(/^COUPON_INVALID/);
    await service.rpc("fail_order_payment", { p_order_id: (first.data as { order_id: string }).order_id, p_provider: "test" });
    const third = await order(await cartWith([[candle.id, 1]], "WELCOME10"), email, methods.pickup);
    expect(third.error).toBeNull();
    await service.rpc("fail_order_payment", { p_order_id: (third.data as { order_id: string }).order_id, p_provider: "test" });
  });
});

describe("row level security", () => {
  it("the public cannot read private tables", async () => {
    for (const table of ["orders", "order_items", "order_addresses", "carts", "cart_items", "payments", "payment_events", "inventory", "product_private", "profiles", "audit_logs", "coupons", "admin_user_roles", "leads", "newsletter_subscribers"] as const) {
      const { data, error } = await anon.from(table).select("*").limit(5);
      expect(error ?? data, `anon read of ${table}`).toSatisfy((v: unknown) => (Array.isArray(v) ? v.length === 0 : true));
    }
  });

  it("the public cannot write the catalog or call checkout functions", async () => {
    const { data: p } = await anon.from("products").select("id, price").limit(1).single();
    const upd = await anon.from("products").update({ price: 1 }).eq("id", p!.id).select();
    expect(upd.data ?? []).toHaveLength(0);
    const { data: after } = await service.from("products").select("price").eq("id", p!.id).single();
    expect(after!.price).toBe(p!.price);
    expect((await anon.from("products").insert({ name: "x", slug: "x", sku: "x", price: 1 })).error).not.toBeNull();

    const cartId = await cartWith([]);
    for (const [fn, args] of [
      ["create_order", { p_cart_id: cartId, p_customer: customer, p_address: address, p_shipping_method_id: methods.home }],
      ["confirm_order_payment", { p_order_id: cartId, p_provider: "x", p_provider_ref: "x", p_amount: 0 }],
      ["cart_summary", { p_cart_id: cartId }],
      ["release_expired_orders", {}],
      ["admin_set_stock", { p_variant_id: cartId, p_on_hand: 999 }],
    ] as const) {
      const res = await anon.rpc(fn, args as never);
      expect(res.error, `anon rpc ${fn}`).not.toBeNull();
    }
  });

  it("the public sees only active products, without cost or raw stock", async () => {
    const { data: draft } = await service.from("products").insert({ name: "טיוטה נסתרת", slug: `hidden-${Date.now()}`, sku: `HID-${Date.now()}`, price: 10, status: "draft" }).select("id, slug").single();
    expect((await anon.from("products").select("id").eq("id", draft!.id)).data).toHaveLength(0);
    expect((await anon.from("catalog_products").select("id").eq("id", draft!.id)).data).toHaveLength(0);
    const { data: search } = await anon.rpc("catalog_search", { p_q: "טיוטה נסתרת" });
    expect((search as { total: number }).total).toBe(0);
    await service.from("products").delete().eq("id", draft!.id);
  });

  async function signedIn(email: string, password: string): Promise<SupabaseClient> {
    const client = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, opts);
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return client;
  }
  async function user(email: string) {
    const password = "test-password-123456";
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true });
    return { id: created.data.user!.id, client: await signedIn(email, password) };
  }

  it("a customer reads their own orders and nobody else's", async () => {
    const stamp = Date.now();
    const alice = await user(`alice${stamp}@example.com`);
    const bob = await user(`bob${stamp}@example.com`);
    const candle = await variant("GFT-6001-01");
    const { data } = await service.rpc("create_order", {
      p_cart_id: await cartWith([[candle.id, 1]]), p_customer: customer, p_address: address, p_shipping_method_id: methods.home, p_user_id: alice.id,
    });
    const orderId = (data as { order_id: string }).order_id;

    expect((await alice.client.from("orders").select("id").eq("id", orderId)).data).toHaveLength(1);
    expect((await alice.client.from("order_items").select("id").eq("order_id", orderId)).data).toHaveLength(1);
    expect((await bob.client.from("orders").select("id").eq("id", orderId)).data).toHaveLength(0);
    expect((await bob.client.from("order_items").select("id").eq("order_id", orderId)).data).toHaveLength(0);
    expect((await bob.client.from("order_addresses").select("id").eq("order_id", orderId)).data).toHaveLength(0);
    // …and cannot change it, promote themselves, or touch stock.
    expect((await alice.client.from("orders").update({ total: 1, subtotal: 1 }).eq("id", orderId).select()).data ?? []).toHaveLength(0);
    const { data: owner } = await service.from("admin_roles").select("id").eq("code", "owner").single();
    expect((await bob.client.from("admin_user_roles").insert({ user_id: bob.id, role_id: owner!.id })).error).not.toBeNull();
    expect((await bob.client.rpc("admin_set_stock", { p_variant_id: candle.id, p_on_hand: 999 })).error).not.toBeNull();
    expect((await bob.client.rpc("my_permissions")).data).toEqual([]);

    await service.rpc("fail_order_payment", { p_order_id: orderId, p_provider: "test" });
    await service.auth.admin.deleteUser(alice.id);
    await service.auth.admin.deleteUser(bob.id);
  });

  it("an admin role is limited to its permissions", async () => {
    const stamp = Date.now();
    const cm = await user(`cm${stamp}@example.com`);
    const { data: role } = await service.from("admin_roles").select("id").eq("code", "catalog_manager").single();
    await service.from("admin_user_roles").insert({ user_id: cm.id, role_id: role!.id });

    const candle = await variant("GFT-6001-01");
    // Catalog + inventory: allowed.
    const upd = await cm.client.from("products").update({ handling_days: 100 + (stamp % 100) }).eq("id", candle.product_id).select("id");
    expect(upd.data).toHaveLength(1);
    const before = await stock(candle.id);
    expect((await cm.client.rpc("admin_set_stock", { p_variant_id: candle.id, p_on_hand: before.on_hand + 1 })).error).toBeNull();
    await service.from("inventory").update({ on_hand: before.on_hand }).eq("variant_id", candle.id);
    // Orders, coupons, settings, users: not allowed.
    expect((await cm.client.from("orders").select("id").limit(5)).data).toHaveLength(0);
    expect((await cm.client.from("coupons").select("id").limit(5)).data).toHaveLength(0);
    expect((await cm.client.from("store_settings").update({ value: {} }).eq("key", "commerce").select()).data ?? []).toHaveLength(0);
    const { data: owner } = await service.from("admin_roles").select("id").eq("code", "owner").single();
    expect((await cm.client.from("admin_user_roles").insert({ user_id: cm.id, role_id: owner!.id })).error).not.toBeNull();
    const { data: anyOrder } = await service.from("orders").select("id").limit(1).single();
    expect((await cm.client.rpc("admin_set_order_status", { p_order_id: anyOrder!.id, p_status: "shipped" })).error).not.toBeNull();

    // The change was written to the audit log with the actor.
    const { data: log } = await service.from("audit_logs").select("actor_id, action").eq("entity", "products").eq("entity_id", candle.product_id).order("id", { ascending: false }).limit(1);
    expect(log![0]).toMatchObject({ actor_id: cm.id, action: "update" });
    await service.auth.admin.deleteUser(cm.id);
  });
});
