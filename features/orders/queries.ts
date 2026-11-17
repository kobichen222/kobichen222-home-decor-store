import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "ממתינה לתשלום",
  paid: "שולמה",
  processing: "בטיפול",
  preparing: "בהכנה",
  ready_to_ship: "מוכנה למשלוח",
  shipped: "נשלחה",
  delivered: "נמסרה",
  cancelled: "בוטלה",
  returned: "הוחזרה",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "לא שולם",
  pending: "ממתין לאישור",
  paid: "שולם",
  failed: "נכשל",
  refunded: "זוכה",
  partially_refunded: "זוכה חלקית",
};

/** Guest access to one order through its unguessable link token. */
export async function getOrderByToken(token: string) {
  if (!UUID.test(token)) return null;
  const { data } = await createServiceClient()
    .from("orders")
    .select(
      `id, order_number, public_token, status, payment_status, customer_name, customer_email, shipping_method_name,
       subtotal, discount_total, shipping_total, total, vat_rate, vat_amount, coupon_code, tracking_number,
       placed_at, reservation_expires_at, cancel_reason,
       items:order_items(id, product_name, variant_name, image_url, unit_price, quantity, line_total),
       address:order_addresses(full_name, phone, city, street, house_number, apartment, zip)`,
    )
    .eq("public_token", token)
    .maybeSingle();
  return data;
}
