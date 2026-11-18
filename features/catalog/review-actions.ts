"use server";
import { z } from "zod";
import { getCustomer } from "@/lib/auth/customer";
import { allow } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";

export type ReviewState = { ok?: boolean; message?: string } | null;

const schema = z.object({
  product_id: z.uuid(),
  rating: z.coerce.number().int().min(1, "נא לבחור דירוג").max(5),
  title: z.string().trim().max(80).optional(),
  body: z.string().trim().min(10, "נא לכתוב לפחות כמה מילים").max(2000),
  author_name: z.string().trim().min(2, "נא להזין שם לתצוגה").max(40),
});

// Only shoppers who bought the product may review it, once per order.
// Every review waits for approval in the admin before it is shown.
export async function submitReview(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const customer = await getCustomer();
  if (!customer) return { message: "יש להתחבר כדי לכתוב חוות דעת" };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: parsed.error.issues[0].message };
  if (!(await allow("review", customer.id, 5, 86400))) return { message: "הגעתם למגבלת חוות הדעת להיום" };
  const db = createServiceClient();
  const { data: purchase } = await db
    .from("order_items")
    .select("order_id, order:orders!inner(user_id, payment_status)")
    .eq("product_id", parsed.data.product_id)
    .eq("order.user_id", customer.id)
    .eq("order.payment_status", "paid")
    .limit(1)
    .maybeSingle();
  if (!purchase) return { message: "רק לקוחות שרכשו את המוצר יכולים לכתוב עליו חוות דעת" };
  const { error } = await db.from("reviews").insert({
    ...parsed.data,
    title: parsed.data.title || null,
    user_id: customer.id,
    email: customer.email,
    order_id: purchase.order_id,
    is_verified: true,
    status: "pending",
  });
  if (error) return { message: error.code === "23505" ? "כבר כתבתם חוות דעת על המוצר הזה" : "השליחה נכשלה" };
  return { ok: true, message: "תודה! חוות הדעת תפורסם לאחר אישור." };
}
