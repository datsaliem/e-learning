import "server-only";

import { serverEnv } from "@/lib/env.server";
import type { PaymentProvider } from "@/features/checkout/providers/types";
import { stripePaymentProvider } from "@/features/checkout/providers/stripe";

export function getPaymentProvider(): PaymentProvider {
  switch (serverEnv.paymentProvider) {
    case "stripe":
      return stripePaymentProvider;
    default:
      throw new Error(`Unsupported payment provider: ${serverEnv.paymentProvider as string}`);
  }
}
