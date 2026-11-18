import "server-only";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { notifyOrderPaid } from "@/lib/email/notify";
import { createServiceClient } from "@/lib/supabase/service";
import type { PaymentEvent } from "@/lib/payments/types";

export type PaymentOutcome = "paid" | "already_paid" | "refund_required" | "failed" | "duplicate" | "ignored";

// Single entry point for every payment notification. Safe against replays:
// the event is first recorded under a unique (provider, event id) key, and
// the settlement itself is idempotent inside the database.
export async function processPaymentEvent(event: PaymentEvent): Promise<PaymentOutcome> {
  const db = createServiceClient();
  const { data: isNew, error: registerError } = await db.rpc("register_payment_event", {
    p_provider: event.provider,
    p_event_id: event.eventId,
    p_order_id: event.orderId,
    p_type: event.type,
    p_payload: event.payload as never,
  });
  if (registerError) throw new Error(`register_payment_event: ${registerError.message}`);
  if (!isNew) return "duplicate";

  let outcome: PaymentOutcome;
  let failure: string | null = null;
  if (event.type === "succeeded") {
    const { data, error } = await db.rpc("confirm_order_payment", {
      p_order_id: event.orderId,
      p_provider: event.provider,
      p_provider_ref: (event.reference ?? null) as unknown as string,
      p_amount: event.amount,
      p_raw: event.payload as never,
    });
    if (error) {
      failure = error.message;
      outcome = "ignored";
    } else {
      outcome = (data as { status: PaymentOutcome }).status;
      if (outcome === "paid") after(() => notifyOrderPaid(event.orderId));
    }
  } else {
    const { data, error } = await db.rpc("fail_order_payment", {
      p_order_id: event.orderId,
      p_provider: event.provider,
      p_reason: event.reason ?? undefined,
    });
    failure = error?.message ?? null;
    outcome = data ? "failed" : "ignored";
  }

  await db
    .from("payment_events")
    .update({ processed_at: new Date().toISOString(), error: failure })
    .eq("provider", event.provider)
    .eq("event_id", event.eventId);

  // Stock and best-seller figures changed.
  revalidateTag("catalog", "max");
  if (failure) throw new Error(`payment event ${event.eventId}: ${failure}`);
  return outcome;
}
