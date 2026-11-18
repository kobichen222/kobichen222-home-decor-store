import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "./index";
import { adminNewOrder, orderConfirmation, orderStatus, type OrderForEmail } from "./templates";

async function storeInfo() {
  const { data } = await createServiceClient().from("store_settings").select("value").eq("key", "business").maybeSingle();
  const b = (data?.value ?? {}) as { name?: string; email?: string };
  return { name: b.name || "החנות", email: b.email || null };
}

async function loadOrder(orderId: string) {
  const { data } = await createServiceClient()
    .from("orders")
    .select("id, order_number, public_token, customer_name, customer_email, total, shipping_method_name, tracking_number, items:order_items(product_name, variant_name, quantity, line_total)")
    .eq("id", orderId)
    .single();
  return data;
}

/** Customer confirmation + store notification after a successful payment. */
export async function notifyOrderPaid(orderId: string) {
  const [order, store] = await Promise.all([loadOrder(orderId), storeInfo()]);
  if (!order) return;
  const o = order as unknown as OrderForEmail;
  await sendEmail({ to: order.customer_email, tag: "order_confirmation", ...orderConfirmation(store.name, o) });
  if (store.email) await sendEmail({ to: store.email, tag: "admin_new_order", ...adminNewOrder(store.name, o, order.id) });
}

export async function notifyOrderStatus(orderId: string, statusLabel: string) {
  const [order, store] = await Promise.all([loadOrder(orderId), storeInfo()]);
  if (!order) return { sent: false };
  return sendEmail({ to: order.customer_email, tag: "order_status", ...orderStatus(store.name, order as unknown as OrderForEmail, statusLabel) });
}

export { storeInfo };
