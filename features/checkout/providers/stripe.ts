import "server-only";

import { createHash } from "node:crypto";
import Stripe from "stripe";

import { serverEnv } from "@/lib/env.server";
import type { NormalizedPaymentEvent } from "@/features/checkout/types";
import {
  InvalidWebhookSignatureError,
  type CreateProviderCheckoutInput,
  type PaymentProvider,
  type ProviderCheckoutSession,
} from "@/features/checkout/providers/types";

const SUPPORTED_CHECKOUT_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

let stripeClient: Stripe | undefined;

function getStripeClient(): Stripe {
  stripeClient ??= new Stripe(serverEnv.stripeSecretKey, {
    apiVersion: "2026-06-24.dahlia",
    maxNetworkRetries: 2,
    appInfo: {
      name: "E-Learning VN",
      version: "0.1.0",
    },
  });
  return stripeClient;
}

function toProviderSession(session: Stripe.Checkout.Session): ProviderCheckoutSession {
  return {
    id: session.id,
    url: session.url,
    status: session.status,
    paymentStatus: session.payment_status,
    expiresAt: new Date(session.expires_at * 1000),
  };
}

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id ?? null;
}

function normalizeEvent(event: Stripe.Event, payload: string): NormalizedPaymentEvent | null {
  if (!SUPPORTED_CHECKOUT_EVENTS.has(event.type)) return null;

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.order_id;

  if (!orderId || session.amount_total === null || !session.currency) {
    throw new Error("Stripe Checkout Session is missing required order metadata");
  }

  return {
    provider: "stripe",
    eventId: event.id,
    eventType: event.type,
    payloadHash: createHash("sha256").update(payload).digest("hex"),
    orderId,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentId(session),
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    currency: session.currency.toLowerCase(),
  };
}

export const stripePaymentProvider: PaymentProvider = {
  id: "stripe",

  async createCheckoutSession(input: CreateProviderCheckoutInput) {
    const stripe = getStripeClient();
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: input.orderId,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        expires_at: Math.floor(input.expiresAt.getTime() / 1000),
        submit_type: "pay",
        line_items: input.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: input.currency,
            unit_amount: item.unitAmount,
            product_data: {
              name: item.title,
              metadata: { course_id: item.courseId },
            },
          },
        })),
        metadata: {
          order_id: input.orderId,
          user_id: input.userId,
        },
        payment_intent_data: {
          metadata: {
            order_id: input.orderId,
            user_id: input.userId,
          },
        },
      },
      { idempotencyKey: `checkout_session:${input.orderId}` },
    );

    return toProviderSession(session);
  },

  async retrieveCheckoutSession(sessionId: string) {
    return toProviderSession(await getStripeClient().checkout.sessions.retrieve(sessionId));
  },

  async expireCheckoutSession(sessionId: string) {
    await getStripeClient().checkout.sessions.expire(sessionId);
  },

  parseWebhook(payload: string, headers: Headers) {
    const signature = headers.get("stripe-signature");
    if (!signature) throw new InvalidWebhookSignatureError();

    let event: Stripe.Event;
    try {
      event = getStripeClient().webhooks.constructEvent(
        payload,
        signature,
        serverEnv.stripeWebhookSecret,
      );
    } catch {
      throw new InvalidWebhookSignatureError();
    }

    return normalizeEvent(event, payload);
  },
};
