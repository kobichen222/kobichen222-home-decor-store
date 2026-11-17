export type PaymentRequest = {
  orderId: string;
  orderNumber: number;
  publicToken: string;
  amount: number;
  currency: "ILS";
  customer: { name: string; email: string; phone: string };
};

/** A provider notification, normalised and already authenticated. */
export type PaymentEvent = {
  provider: string;
  /** Unique per notification: the idempotency key. */
  eventId: string;
  type: "succeeded" | "failed";
  orderId: string;
  amount: number;
  reference: string | null;
  reason?: string;
  payload: unknown;
};

// One adapter per clearing provider (Tranzila, Cardcom, Pelecard…).
// Card details never touch this application: the shopper pays on the
// provider's hosted page and we learn the outcome from a signed webhook.
export interface PaymentProvider {
  readonly name: string;
  /** Start a payment and return the URL of the hosted payment page. */
  createPayment(request: PaymentRequest): Promise<{ redirectUrl: string }>;
  /** Authenticate and parse a webhook. Must throw when the signature is invalid. */
  parseWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}
