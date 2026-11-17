import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { verifySignature } from "./signature";
import type { PaymentEvent, PaymentProvider } from "./types";

const webhookSchema = z.object({
  event_id: z.string().min(8).max(100),
  type: z.enum(["payment.succeeded", "payment.failed"]),
  order_id: z.uuid(),
  amount: z.number().nonnegative(),
  reference: z.string().max(100).nullable(),
  reason: z.string().max(200).optional(),
});

// Development stand-in for a real clearing provider. It follows the same
// contract a real adapter will: hosted payment page → signed webhook.
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createPayment(request) {
    return { redirectUrl: `/checkout/pay/${request.publicToken}` };
  },
  async parseWebhook(rawBody, headers): Promise<PaymentEvent> {
    if (!verifySignature(rawBody, headers.get("x-signature"), serverEnv.paymentWebhookSecret())) {
      throw new Error("INVALID_SIGNATURE");
    }
    const data = webhookSchema.parse(JSON.parse(rawBody));
    return {
      provider: "mock",
      eventId: data.event_id,
      type: data.type === "payment.succeeded" ? "succeeded" : "failed",
      orderId: data.order_id,
      amount: data.amount,
      reference: data.reference,
      reason: data.reason,
      payload: data,
    };
  },
};
