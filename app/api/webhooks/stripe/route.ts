import { z } from "zod";

import { getPaymentProvider } from "@/features/checkout/providers";
import { InvalidWebhookSignatureError } from "@/features/checkout/providers/types";
import { processPaymentEvent } from "@/features/checkout/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const orderIdSchema = z.string().uuid();
const MAX_WEBHOOK_BYTES = 1024 * 1024;

export async function POST(request: Request) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  const payload = await request.text();
  if (new TextEncoder().encode(payload).byteLength > MAX_WEBHOOK_BYTES) {
    return Response.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const provider = getPaymentProvider();
    if (provider.id !== "stripe") {
      return Response.json({ error: "Stripe provider is disabled" }, { status: 503 });
    }

    // Signature verification happens before parsing or trusting any field.
    const event = provider.parseWebhook(payload, request.headers);
    if (!event) return Response.json({ received: true, ignored: true });

    if (!orderIdSchema.safeParse(event.orderId).success) {
      return Response.json({ error: "Invalid order metadata" }, { status: 400 });
    }

    const outcome = await processPaymentEvent(event);
    if (outcome.result === "failed") {
      return Response.json({ error: "Event processing failed" }, { status: 500 });
    }
    if (outcome.result === "payload_mismatch") {
      return Response.json({ error: "Event payload mismatch" }, { status: 400 });
    }

    return Response.json({ received: true, result: outcome.result });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Do not log the raw body, signature, API keys, or customer data.
    console.error("Stripe webhook processing error", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return Response.json({ error: "Webhook processing unavailable" }, { status: 500 });
  }
}
