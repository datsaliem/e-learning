import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  CheckoutOrder,
  CheckoutOrderItem,
  NormalizedPaymentEvent,
  OrderStatus,
  PaymentProviderId,
  PaymentStatus,
  ProcessPaymentEventResult,
} from "@/features/checkout/types";

interface OrderRow {
  id: string;
  user_id: string;
  status: OrderStatus;
  currency: string;
  subtotal_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  payment_provider: PaymentProviderId;
  provider_checkout_session_id: string | null;
  provider_payment_intent_id: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
}

interface OrderItemRow {
  course_id: string;
  instructor_id: string;
  course_title: string;
  course_slug: string;
  list_amount: number | string;
  unit_amount: number | string;
  discount_amount: number | string;
}

const ORDER_COLUMNS = [
  "id",
  "user_id",
  "status",
  "currency",
  "subtotal_amount",
  "discount_amount",
  "total_amount",
  "payment_provider",
  "provider_checkout_session_id",
  "provider_payment_intent_id",
  "expires_at",
  "paid_at",
  "created_at",
].join(",");

const ORDER_ITEM_COLUMNS = [
  "course_id",
  "instructor_id",
  "course_title",
  "course_slug",
  "list_amount",
  "unit_amount",
  "discount_amount",
].join(",");

export class CheckoutDatabaseError extends Error {
  constructor(
    message: string,
    readonly kind: "unavailable" | "database" = "database",
  ) {
    super(message);
    this.name = "CheckoutDatabaseError";
  }
}

function money(value: number | string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CheckoutDatabaseError("Database returned an invalid monetary amount");
  }
  return parsed;
}

function mapOrderItem(row: OrderItemRow): CheckoutOrderItem {
  return {
    courseId: row.course_id,
    instructorId: row.instructor_id,
    title: row.course_title,
    slug: row.course_slug,
    listAmount: money(row.list_amount),
    unitAmount: money(row.unit_amount),
    discountAmount: money(row.discount_amount),
  };
}

function mapOrder(
  row: OrderRow,
  items: OrderItemRow[],
  paymentStatus: PaymentStatus | null,
): CheckoutOrder {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    currency: row.currency,
    subtotalAmount: money(row.subtotal_amount),
    discountAmount: money(row.discount_amount),
    totalAmount: money(row.total_amount),
    paymentProvider: row.payment_provider,
    providerCheckoutSessionId: row.provider_checkout_session_id,
    providerPaymentIntentId: row.provider_payment_intent_id,
    expiresAt: row.expires_at,
    paidAt: row.paid_at,
    createdAt: row.created_at,
    items: items.map(mapOrderItem),
    paymentStatus,
  };
}

function mapCreateOrderError(message: string): CheckoutDatabaseError {
  if (
    message.includes("already-owned") ||
    message.includes("owned by the instructor") ||
    message.includes("unavailable or free")
  ) {
    return new CheckoutDatabaseError(
      "Một hoặc nhiều khoá học không còn đủ điều kiện thanh toán.",
      "unavailable",
    );
  }
  return new CheckoutDatabaseError("Không thể tạo đơn hàng.");
}

export async function createCheckoutOrder(
  userId: string,
  courseIds: string[],
  paymentProvider: PaymentProviderId,
): Promise<{ orderId: string; reused: boolean }> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_checkout_order", {
    p_user_id: userId,
    p_course_ids: courseIds,
    p_payment_provider: paymentProvider,
  });

  if (error) throw mapCreateOrderError(error.message);

  const row = (data as Array<{ order_id: string; reused: boolean }> | null)?.[0];
  if (!row) throw new CheckoutDatabaseError("Database did not return a checkout order");

  return { orderId: row.order_id, reused: row.reused };
}

async function loadOrderWithClient(
  client: SupabaseClient,
  orderQuery: { orderId?: string; sessionId?: string; userId?: string },
): Promise<CheckoutOrder | null> {
  let query = client.from("orders").select(ORDER_COLUMNS);
  if (orderQuery.orderId) query = query.eq("id", orderQuery.orderId);
  if (orderQuery.sessionId) {
    query = query.eq("provider_checkout_session_id", orderQuery.sessionId);
  }
  if (orderQuery.userId) query = query.eq("user_id", orderQuery.userId);

  const { data: rawOrder, error: orderError } = await query.maybeSingle();
  if (orderError) throw new CheckoutDatabaseError("Không thể đọc đơn hàng.");
  if (!rawOrder) return null;

  const order = rawOrder as unknown as OrderRow;
  const [itemsResult, paymentResult] = await Promise.all([
    client.from("order_items").select(ORDER_ITEM_COLUMNS).eq("order_id", order.id),
    client.from("payments").select("status").eq("order_id", order.id).maybeSingle(),
  ]);

  if (itemsResult.error || paymentResult.error) {
    throw new CheckoutDatabaseError("Không thể đọc chi tiết đơn hàng.");
  }

  return mapOrder(
    order,
    (itemsResult.data ?? []) as unknown as OrderItemRow[],
    (paymentResult.data?.status as PaymentStatus | undefined) ?? null,
  );
}

export async function getCheckoutOrderForServer(orderId: string): Promise<CheckoutOrder | null> {
  return loadOrderWithClient(createAdminClient(), { orderId });
}

export async function getCheckoutOrderBySessionForUser(
  userId: string,
  sessionId: string,
): Promise<CheckoutOrder | null> {
  return loadOrderWithClient(await createClient(), { userId, sessionId });
}

export async function getCheckoutOrderByIdForUser(
  userId: string,
  orderId: string,
): Promise<CheckoutOrder | null> {
  return loadOrderWithClient(await createClient(), { userId, orderId });
}

export async function setCheckoutOrderExpiry(orderId: string, expiresAt: Date): Promise<void> {
  const { error } = await createAdminClient()
    .from("orders")
    .update({ expires_at: expiresAt.toISOString() })
    .eq("id", orderId)
    .in("status", ["pending", "processing"]);

  if (error) throw new CheckoutDatabaseError("Không thể chuẩn bị thời hạn thanh toán.");
}

export async function expireCheckoutOrder(orderId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("orders")
    .update({ status: "expired" })
    .eq("id", orderId)
    .in("status", ["pending", "processing"]);

  if (error) throw new CheckoutDatabaseError("Không thể đóng phiên thanh toán cũ.");
}

export async function linkCheckoutSession(input: {
  orderId: string;
  userId: string;
  paymentProvider: PaymentProviderId;
  checkoutSessionId: string;
  expiresAt: Date;
}): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("link_checkout_session", {
    p_order_id: input.orderId,
    p_user_id: input.userId,
    p_payment_provider: input.paymentProvider,
    p_checkout_session_id: input.checkoutSessionId,
    p_expires_at: input.expiresAt.toISOString(),
  });

  if (error) throw new CheckoutDatabaseError("Không thể liên kết phiên thanh toán.");
  return data === true;
}

export async function processPaymentEvent(
  event: NormalizedPaymentEvent,
): Promise<ProcessPaymentEventResult> {
  const { data, error } = await createAdminClient().rpc("process_checkout_payment_event", {
    p_provider: event.provider,
    p_event_id: event.eventId,
    p_event_type: event.eventType,
    p_payload_hash: event.payloadHash,
    p_order_id: event.orderId,
    p_checkout_session_id: event.checkoutSessionId,
    p_payment_intent_id: event.paymentIntentId,
    p_payment_status: event.paymentStatus,
    p_amount_total: event.amountTotal,
    p_currency: event.currency,
  });

  if (error) throw new CheckoutDatabaseError("Không thể xử lý payment event.");

  const row = (
    data as Array<{
      result: ProcessPaymentEventResult["result"];
      processed_order_id: string;
      enrollment_count: number;
    }> | null
  )?.[0];

  if (!row) throw new CheckoutDatabaseError("Database did not return a payment event result");

  return {
    result: row.result,
    processedOrderId: row.processed_order_id,
    enrollmentCount: row.enrollment_count,
  };
}
