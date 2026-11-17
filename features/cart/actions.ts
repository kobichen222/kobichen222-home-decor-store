"use server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getOrCreateCartId, readCartId, summarize } from "./server";
import type { CartActionResult } from "./types";

const MAX_QTY = 99;
const addSchema = z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(MAX_QTY) });
const updateSchema = z.object({ itemId: z.uuid(), quantity: z.number().int().min(0).max(MAX_QTY) });
const couponSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,32}$/);

async function result(cartId: string | null, error?: string): Promise<CartActionResult> {
  return { ok: !error, error, cart: await summarize(cartId) };
}

function stockMessage(available: number) {
  return available > 0 ? `נותרו ${available} יחידות בלבד במלאי` : "המוצר אזל מהמלאי";
}

export async function addToCart(variantId: string, quantity: number): Promise<CartActionResult> {
  const parsed = addSchema.safeParse({ variantId, quantity });
  if (!parsed.success) return result(await readCartId(), "בקשה לא תקינה");
  const db = createServiceClient();

  // The variant must be on sale right now (active product + active variant).
  const { data: variant } = await db
    .from("catalog_variants")
    .select("id, available, in_stock, allow_backorder")
    .eq("id", parsed.data.variantId)
    .maybeSingle();
  if (!variant) return result(await readCartId(), "המוצר אינו זמין כרגע");

  const cartId = await getOrCreateCartId();
  const { data: existing } = await db
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cartId)
    .eq("variant_id", parsed.data.variantId)
    .maybeSingle();

  const wanted = Math.min((existing?.quantity ?? 0) + parsed.data.quantity, MAX_QTY);
  if (!variant.allow_backorder && wanted > (variant.available ?? 0)) {
    return result(cartId, stockMessage(variant.available ?? 0));
  }
  const { error } = await db
    .from("cart_items")
    .upsert({ cart_id: cartId, variant_id: parsed.data.variantId, quantity: wanted }, { onConflict: "cart_id,variant_id" });
  return result(cartId, error ? "לא הצלחנו להוסיף את המוצר לסל" : undefined);
}

export async function updateCartItem(itemId: string, quantity: number): Promise<CartActionResult> {
  const parsed = updateSchema.safeParse({ itemId, quantity });
  const cartId = await readCartId();
  if (!parsed.success || !cartId) return result(cartId, "בקשה לא תקינה");
  const db = createServiceClient();

  // Every statement is scoped to the caller's own cart.
  if (parsed.data.quantity === 0) {
    await db.from("cart_items").delete().eq("id", parsed.data.itemId).eq("cart_id", cartId);
    return result(cartId);
  }
  const { data: item } = await db
    .from("cart_items")
    .select("variant_id")
    .eq("id", parsed.data.itemId)
    .eq("cart_id", cartId)
    .maybeSingle();
  if (!item) return result(cartId, "הפריט לא נמצא בסל");
  const { data: variant } = await db
    .from("catalog_variants")
    .select("available, allow_backorder")
    .eq("id", item.variant_id)
    .maybeSingle();
  if (variant && !variant.allow_backorder && parsed.data.quantity > (variant.available ?? 0)) {
    return result(cartId, stockMessage(variant.available ?? 0));
  }
  await db.from("cart_items").update({ quantity: parsed.data.quantity }).eq("id", parsed.data.itemId).eq("cart_id", cartId);
  return result(cartId);
}

export async function applyCoupon(code: string): Promise<CartActionResult> {
  const cartId = await readCartId();
  const parsed = couponSchema.safeParse(code);
  if (!cartId) return result(cartId, "הסל ריק");
  if (!parsed.success) return result(cartId, "קוד הקופון אינו תקין");
  const db = createServiceClient();
  await db.from("carts").update({ coupon_code: parsed.data }).eq("id", cartId);
  const cart = await summarize(cartId);
  if (cart.coupon && !cart.coupon.valid) {
    // Do not keep a coupon that does not apply.
    await db.from("carts").update({ coupon_code: null }).eq("id", cartId);
    return { ok: false, error: cart.coupon.message ?? "הקופון אינו תקף", cart: await summarize(cartId) };
  }
  return { ok: true, cart };
}

export async function removeCoupon(): Promise<CartActionResult> {
  const cartId = await readCartId();
  if (cartId) await createServiceClient().from("carts").update({ coupon_code: null }).eq("id", cartId);
  return result(cartId);
}
