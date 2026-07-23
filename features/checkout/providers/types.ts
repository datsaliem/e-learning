import type { NormalizedPaymentEvent, PaymentProviderId } from "@/features/checkout/types";

export interface ProviderLineItem {
  courseId: string;
  title: string;
  unitAmount: number;
}

export interface CreateProviderCheckoutInput {
  orderId: string;
  userId: string;
  currency: string;
  items: ProviderLineItem[];
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
}

export interface ProviderCheckoutSession {
  id: string;
  url: string | null;
  status: "open" | "complete" | "expired" | null;
  paymentStatus: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  createCheckoutSession(input: CreateProviderCheckoutInput): Promise<ProviderCheckoutSession>;
  retrieveCheckoutSession(sessionId: string): Promise<ProviderCheckoutSession>;
  expireCheckoutSession(sessionId: string): Promise<void>;
  parseWebhook(payload: string, headers: Headers): NormalizedPaymentEvent | null;
}

export class InvalidWebhookSignatureError extends Error {
  constructor() {
    super("Invalid payment webhook signature");
    this.name = "InvalidWebhookSignatureError";
  }
}
