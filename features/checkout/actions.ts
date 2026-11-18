"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { readCartId } from "@/features/cart/server";
import { getCustomer } from "@/lib/auth/customer";
import { getPaymentProvider, isMockPayments } from "@/lib/payments";
import { createServiceClient } from "@/lib/supabase/service";
import { checkoutSchema, fieldErrors, type CheckoutErrors } from "@/lib/validations/checkout";
import { processPaymentEvent } from "./payment-events";

export type CheckoutState = { errors?: CheckoutErrors; message?: string } | null;

const DB_ERRORS: Record<string, string> = {
  CART_NOT_FOUND: "הסל לא נמצא. רעננו את העמוד ונסו שוב.",
  CART_EMPTY: "הסל ריק.",
  SHIPPING_METHOD_INVALID: "שיטת האספקה שנבחרה אינה זמינה.",
  ADDRESS_REQUIRED: "נא למלא כתובת למשלוח.",
};

function orderErrorMessage(raw: string): string {
  const [code, detail] = raw.split(":");
  if (code === "OUT_OF_STOCK") return `המוצר ״${detail}״ אזל מהמלאי או שאין מספיק יחידות. עדכנו את הסל ונסו שוב.`;
  if (code === "ITEM_UNAVAILABLE") return `המוצר ״${detail}״ אינו זמין עוד. הסירו אותו מהסל ונסו שוב.`;
  if (code === "COUPON_INVALID") return `הקופון אינו תקף: ${detail}`;
  return DB_ERRORS[code] ?? "לא הצלחנו ליצור את ההזמנה. נסו שוב בעוד רגע.";
}

export async function placeOrder(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const get = (k: string) => (formData.get(k) as string | null) ?? undefined;
  const db = createServiceClient();

  const methodId = get("shipping_method_id");
  const { data: method } = z.uuid().safeParse(methodId).success
    ? await db.from("shipping_methods").select("id, requires_address").eq("id", methodId!).eq("is_active", true).maybeSingle()
    : { data: null };

  const parsed = checkoutSchema.safeParse({
    name: get("name"),
    phone: get("phone"),
    email: get("email"),
    customer_type: get("customer_type"),
    company_name: get("company_name"),
    company_number: get("company_number"),
    shipping_method_id: methodId,
    requires_address: method?.requires_address ?? true,
    city: get("city"),
    street: get("street"),
    house_number: get("house_number"),
    apartment: get("apartment"),
    zip: get("zip"),
    address_notes: get("address_notes"),
    note: get("note"),
    terms: formData.get("terms") === "on",
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error), message: "נא לתקן את השדות המסומנים." };
  if (!method) return { errors: { shipping_method_id: "נא לבחור שיטת אספקה" } };

  const cartId = await readCartId();
  if (!cartId) return { message: DB_ERRORS.CART_NOT_FOUND };
  const v = parsed.data;

  // Free stock held by orders that were never paid. The scheduled job does
  // the same; doing it here too means a shopper is never blocked by an
  // expired reservation, however often the job runs.
  await db.rpc("release_expired_orders");

  // Prices, discounts, shipping and the total are computed inside the
  // database from the catalog. Nothing price-related comes from the form.
  const { data, error } = await db.rpc("create_order", {
    p_cart_id: cartId,
    p_customer: {
      name: v.name,
      email: v.email,
      phone: v.phone,
      type: v.customer_type,
      company_name: v.customer_type === "business" ? v.company_name : "",
      company_number: v.customer_type === "business" ? v.company_number : "",
    },
    p_address: method.requires_address
      ? { city: v.city, street: v.street, house_number: v.house_number, apartment: v.apartment, zip: v.zip, notes: v.address_notes }
      : (null as never),
    p_shipping_method_id: method.id,
    p_note: v.note,
    p_user_id: (await getCustomer())?.id,
  });
  if (error) return { message: orderErrorMessage(error.message) };

  const order = data as { order_id: string; order_number: number; public_token: string; total: number };
  let redirectUrl: string;
  try {
    ({ redirectUrl } = await getPaymentProvider().createPayment({
      orderId: order.order_id,
      orderNumber: order.order_number,
      publicToken: order.public_token,
      amount: order.total,
      currency: "ILS",
      customer: { name: v.name, email: v.email, phone: v.phone },
    }));
    await db.from("orders").update({ payment_status: "pending" }).eq("id", order.order_id);
  } catch (e) {
    console.error("createPayment failed", e);
    await db.rpc("fail_order_payment", { p_order_id: order.order_id, p_provider: "none", p_reason: "payment_init_failed" });
    return { message: "לא הצלחנו להתחיל את התשלום. לא בוצע חיוב. נסו שוב בעוד רגע." };
  }
  redirect(redirectUrl);
}

// --- Payment simulator (PAYMENT_PROVIDER=mock only) ----------------------
export async function simulatePayment(formData: FormData): Promise<void> {
  if (!isMockPayments()) throw new Error("Payment simulator is disabled");
  getPaymentProvider(); // refuses to run in production
  const token = z.uuid().parse(formData.get("token"));
  const success = formData.get("outcome") === "success";
  const db = createServiceClient();
  const { data: order } = await db.from("orders").select("id, total").eq("public_token", token).maybeSingle();
  if (!order) throw new Error("ORDER_NOT_FOUND");
  try {
    await processPaymentEvent({
      provider: "mock",
      eventId: `sim_${randomUUID()}`,
      type: success ? "succeeded" : "failed",
      orderId: order.id,
      amount: Number(order.total),
      reference: success ? `MOCK-${randomUUID().slice(0, 8).toUpperCase()}` : null,
      reason: success ? undefined : "הכרטיס נדחה (סימולציה)",
      payload: { simulated: true },
    });
  } catch (e) {
    console.error("simulatePayment", e);
  }
  redirect(`/order/${token}`);
}
