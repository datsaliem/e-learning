"use server";

import { z } from "zod";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  getPaymentProvider,
  isPaymentProviderDisabled,
  PaymentProviderDisabledError,
} from "@/features/checkout/providers";
import {
  CheckoutDatabaseError,
  createCheckoutOrder,
  expireCheckoutOrder,
  getCheckoutOrderForServer,
  linkCheckoutSession,
  setCheckoutOrderExpiry,
} from "@/features/checkout/services";
import type { CheckoutActionResult } from "@/features/checkout/types";

const courseIdSchema = z.string().uuid();
const SESSION_DURATION_MS = 60 * 60 * 1000;

function isConfigurationError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Missing required server environment");
}

function checkoutUrls(orderId: string) {
  const appUrl = env.appUrl.replace(/\/$/, "");
  return {
    successUrl: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/checkout/failure?order_id=${encodeURIComponent(orderId)}`,
  };
}

export async function startCheckout(): Promise<CheckoutActionResult> {
  if (isPaymentProviderDisabled()) {
    return {
      error: "Thanh toán đang tạm đóng. Bạn vẫn có thể duyệt và lưu khóa học.",
      code: "configuration_error",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Vui lòng đăng nhập để tiếp tục thanh toán.",
      code: "unauthenticated",
    };
  }

  const { data: cartRows, error: cartError } = await supabase
    .from("cart_items")
    .select("course_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (cartError) {
    return { error: "Không thể đọc giỏ hàng. Vui lòng thử lại.", code: "provider_error" };
  }

  const courseIds = [...new Set((cartRows ?? []).map((row) => row.course_id))];
  if (courseIds.length === 0) {
    return { error: "Giỏ hàng đang trống.", code: "empty_cart" };
  }

  if (courseIds.some((id) => !courseIdSchema.safeParse(id).success)) {
    return {
      error:
        "Khoá học demo chưa được đồng bộ vào CMS. Hãy dùng khoá học đã publish từ Course Builder để thử thanh toán.",
      code: "catalog_not_ready",
    };
  }

  try {
    const provider = getPaymentProvider();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const created = await createCheckoutOrder(user.id, courseIds, provider.id);
      const order = await getCheckoutOrderForServer(created.orderId);
      if (!order || order.items.length === 0) {
        throw new CheckoutDatabaseError("Không thể tải snapshot đơn hàng.");
      }

      if (order.providerCheckoutSessionId) {
        const existingSession = await provider.retrieveCheckoutSession(
          order.providerCheckoutSessionId,
        );

        if (existingSession.status === "open" && existingSession.url) {
          return { data: { url: existingSession.url, orderId: order.id } };
        }

        if (existingSession.status === "complete") {
          const successUrl = `${env.appUrl.replace(/\/$/, "")}/checkout/success?session_id=${encodeURIComponent(existingSession.id)}`;
          return { data: { url: successUrl, orderId: order.id } };
        }

        await expireCheckoutOrder(order.id);
        continue;
      }

      // Deterministic per order, so concurrent retries send identical Stripe
      // parameters and safely share the same idempotency key.
      const expiresAt = new Date(new Date(order.createdAt).getTime() + SESSION_DURATION_MS);
      if (expiresAt.getTime() <= Date.now() + 30 * 60 * 1000) {
        await expireCheckoutOrder(order.id);
        continue;
      }

      await setCheckoutOrderExpiry(order.id, expiresAt);
      const urls = checkoutUrls(order.id);
      const session = await provider.createCheckoutSession({
        orderId: order.id,
        userId: user.id,
        currency: order.currency,
        items: order.items.map((item) => ({
          courseId: item.courseId,
          title: item.title,
          unitAmount: item.unitAmount,
        })),
        successUrl: urls.successUrl,
        cancelUrl: urls.cancelUrl,
        expiresAt,
      });

      if (!session.url) {
        await provider.expireCheckoutSession(session.id);
        return { error: "Cổng thanh toán không trả về URL hợp lệ.", code: "provider_error" };
      }

      const linked = await linkCheckoutSession({
        orderId: order.id,
        userId: user.id,
        paymentProvider: provider.id,
        checkoutSessionId: session.id,
        expiresAt: session.expiresAt,
      });

      if (!linked) {
        await provider.expireCheckoutSession(session.id);
        return { error: "Không thể xác nhận phiên thanh toán.", code: "provider_error" };
      }

      return { data: { url: session.url, orderId: order.id } };
    }

    return { error: "Không thể mở phiên thanh toán mới.", code: "provider_error" };
  } catch (error) {
    if (error instanceof PaymentProviderDisabledError) {
      return {
        error: "Thanh toán đang tạm đóng. Bạn vẫn có thể duyệt và lưu khóa học.",
        code: "configuration_error",
      };
    }

    if (isConfigurationError(error)) {
      return {
        error: "Cổng thanh toán chưa được cấu hình trên máy chủ.",
        code: "configuration_error",
      };
    }

    if (error instanceof CheckoutDatabaseError && error.kind === "unavailable") {
      return { error: error.message, code: "unavailable" };
    }

    return {
      error: "Chưa thể kết nối cổng thanh toán. Vui lòng thử lại.",
      code: "provider_error",
    };
  }
}
