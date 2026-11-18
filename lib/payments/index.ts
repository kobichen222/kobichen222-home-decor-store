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
  // The simulator must never take orders on a live shop by accident. On a
  // production deployment it runs only when the deployment is explicitly
  // declared a demo site (ALLOW_MOCK_PAYMENTS=true).
  if (name === "mock" && process.env.VERCEL_ENV === "production" && process.env.ALLOW_MOCK_PAYMENTS !== "true") {
    throw new Error("The mock payment provider is disabled in production (set ALLOW_MOCK_PAYMENTS=true for a demo site)");
  }
  return provider;
}
