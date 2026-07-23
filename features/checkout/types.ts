export type PaymentProviderId = "stripe";

export type OrderStatus =
  | "pending"
  | "processing"
  | "paid"
  | "payment_failed"
  | "checkout_failed"
  | "cancelled"
  | "expired"
  | "refunded";

export type PaymentStatus = "pending" | "processing" | "succeeded" | "failed" | "refunded";

export interface CheckoutOrderItem {
  courseId: string;
  instructorId: string;
  title: string;
  slug: string;
  listAmount: number;
  unitAmount: number;
  discountAmount: number;
}

export interface CheckoutOrder {
  id: string;
  userId: string;
  status: OrderStatus;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentProvider: PaymentProviderId;
  providerCheckoutSessionId: string | null;
  providerPaymentIntentId: string | null;
  expiresAt: string | null;
  paidAt: string | null;
  createdAt: string;
  items: CheckoutOrderItem[];
  paymentStatus: PaymentStatus | null;
}

export type CheckoutActionCode =
  | "unauthenticated"
  | "empty_cart"
  | "catalog_not_ready"
  | "unavailable"
  | "configuration_error"
  | "provider_error";

export type CheckoutActionResult =
  { data: { url: string; orderId: string } } | { error: string; code: CheckoutActionCode };

export interface NormalizedPaymentEvent {
  provider: PaymentProviderId;
  eventId: string;
  eventType: string;
  payloadHash: string;
  orderId: string;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  paymentStatus: string;
  amountTotal: number;
  currency: string;
}

export interface ProcessPaymentEventResult {
  result: "processed" | "duplicate" | "processing" | "ignored" | "failed" | "payload_mismatch";
  processedOrderId: string;
  enrollmentCount: number;
}
