import "server-only";
import { cookies } from "next/headers";
import { getCustomer } from "@/lib/auth/customer";
import { createServiceClient } from "@/lib/supabase/service";
import { EMPTY_CART, type CartSummary } from "./types";

// The cart lives in the database. The browser only holds an opaque,
// httpOnly token; it never sees the cart id and never sends prices.
const CART_COOKIE = "cart_token";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function readCartId(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  if (!token || !UUID.test(token)) return null;
  const { data } = await createServiceClient()
    .from("carts")
    .select("id")
    .eq("token", token)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
}

/** Only callable where cookies are writable (Server Actions / Route Handlers). */
/**
 * The cart belongs to whoever is signed in right now (business pricing
 * depends on it), and to nobody after sign-out.
 */
export async function syncCartOwner(cartId: string): Promise<void> {
  const userId = (await getCustomer())?.id ?? null;
  await createServiceClient().from("carts").update({ user_id: userId }).eq("id", cartId);
}

export async function getOrCreateCartId(): Promise<string> {
  const existing = await readCartId();
  if (existing) {
    await syncCartOwner(existing);
    return existing;
  }
  const userId = (await getCustomer())?.id ?? null;
  const { data, error } = await createServiceClient().from("carts").insert({ user_id: userId }).select("id, token").single();
  if (error || !data) throw new Error(`cart create failed: ${error?.message}`);
  (await cookies()).set(CART_COOKIE, data.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return data.id;
}

export async function summarize(cartId: string | null, shippingMethodId?: string | null): Promise<CartSummary> {
  if (!cartId) return EMPTY_CART;
  const { data, error } = await createServiceClient().rpc("cart_summary", {
    p_cart_id: cartId,
    p_shipping_method_id: shippingMethodId ?? undefined,
  });
  if (error) throw new Error(`cart_summary: ${error.message}`);
  return (data as unknown as CartSummary) ?? EMPTY_CART;
}

export async function getCart(shippingMethodId?: string | null): Promise<CartSummary> {
  return summarize(await readCartId(), shippingMethodId);
}
