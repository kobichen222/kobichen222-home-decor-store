import { NextResponse } from "next/server";
import { processPaymentEvent } from "@/features/checkout/payment-events";
import { getPaymentProvider } from "@/lib/payments";
import type { PaymentEvent } from "@/lib/payments/types";

// Payment provider → store. The body is authenticated by the provider
// adapter (signature check) before anything is read from it.
export async function POST(request: Request) {
  const raw = await request.text();
  let event: PaymentEvent;
  try {
    event = await getPaymentProvider().parseWebhook(raw, request.headers);
  } catch {
    return NextResponse.json({ error: "invalid webhook" }, { status: 401 });
  }
  try {
    const outcome = await processPaymentEvent(event);
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    console.error("payment webhook failed", e);
    // The event is stored with its error; 200 stops pointless retries of a
    // notification we will never be able to apply (e.g. amount mismatch).
    return NextResponse.json({ ok: false, outcome: "rejected" });
  }
}
