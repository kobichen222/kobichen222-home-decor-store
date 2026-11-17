import "server-only";
import { serverEnv } from "@/lib/env";
import { mockProvider } from "./mock";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  mock: mockProvider,
  // tranzila: tranzilaProvider, cardcom: cardcomProvider, … (stage 7)
};

export function isMockPayments(): boolean {
  return serverEnv.paymentProvider() === "mock";
}

export function getPaymentProvider(): PaymentProvider {
  const name = serverEnv.paymentProvider();
  const provider = providers[name];
  if (!provider) throw new Error(`PAYMENT_PROVIDER "${name}" is not configured`);
  // The simulator must never take orders on the live site.
  if (name === "mock" && process.env.VERCEL_ENV === "production") {
    throw new Error("The mock payment provider is disabled in production");
  }
  return provider;
}
