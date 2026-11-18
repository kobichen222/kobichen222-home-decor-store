import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { storeInfo } from "@/lib/email/notify";
import { abandonedCart } from "@/lib/email/templates";
import { serverEnv } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";

// Daily: one reminder per abandoned cart, only to shoppers who gave
// marketing consent and are still subscribed (Israeli spam law).
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${serverEnv.cronSecret()}`);
  const received = Buffer.from(request.headers.get("authorization") ?? "");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = createServiceClient();
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const until = new Date(Date.now() - 20 * 3600000).toISOString();
  const { data: carts } = await db
    .from("carts")
    .select("id, email, items:cart_items(variant:product_variants(product:products(name)))")
    .eq("status", "active")
    .is("reminder_sent_at", null)
    .not("email", "is", null)
    .gte("updated_at", since)
    .lte("updated_at", until)
    .limit(200);
  const store = await storeInfo();
  let sent = 0;
  for (const cart of carts ?? []) {
    if (!cart.email || !cart.items.length) continue;
    const { data: sub } = await db.from("newsletter_subscribers").select("id").eq("email", cart.email).is("unsubscribed_at", null).maybeSingle();
    if (!sub) continue;
    const { data: order } = await db.from("orders").select("customer_name").eq("cart_id", cart.id).order("placed_at", { ascending: false }).limit(1).maybeSingle();
    const products = cart.items.map((i) => i.variant?.product?.name).filter(Boolean).join(", ");
    const res = await sendEmail({ to: cart.email, tag: "abandoned_cart", ...abandonedCart(store.name, order?.customer_name ?? null, products) });
    if (res.sent) {
      sent++;
      await db.from("carts").update({ reminder_sent_at: new Date().toISOString() }).eq("id", cart.id);
    }
  }
  return NextResponse.json({ candidates: carts?.length ?? 0, sent });
}
