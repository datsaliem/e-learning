import "server-only";

import { serverEnv } from "@/lib/env.server";
import type { PaymentProvider } from "@/features/checkout/providers/types";
import { stripePaymentProvider } from "@/features/checkout/providers/stripe";

export class PaymentProviderDisabledError extends Error {
  constructor() {
    super("Payments are disabled");
    this.name = "PaymentProviderDisabledError";
  }
}

export function isPaymentProviderDisabled(): boolean {
  return serverEnv.paymentProvider === "disabled";
}

export function getPaymentProvider(): PaymentProvider {
  const providerMode = serverEnv.paymentProvider;

  switch (providerMode) {
    case "stripe":
      return stripePaymentProvider;
    case "disabled":
      throw new PaymentProviderDisabledError();
    default:
      return providerMode satisfies never;
  }
}
