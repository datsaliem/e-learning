"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { cartCourseIdSchema, cartCourseIdsSchema } from "@/features/cart/schemas";
import { getCartCourseById, getCartCoursesByIds } from "@/features/cart/services";
import type { CartActionResult, CartCourse, CartSyncResult } from "@/features/cart/types";

const SESSION_ERROR = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getCartContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_ERROR } as const;
  }

  return { ok: true, supabase, user } as const;
}

async function getOwnedCourseIds(
  supabase: SupabaseServerClient,
  userId: string,
  courseIds: string[],
): Promise<Set<string>> {
  const databaseCourseIds = courseIds.filter((id) => z.string().uuid().safeParse(id).success);
  if (databaseCourseIds.length === 0) return new Set();

  const [enrollmentResult, instructorResult] = await Promise.all([
    supabase
      .from("enrollments")
      .select("course_id")
      .eq("student_id", userId)
      .in("course_id", databaseCourseIds),
    supabase.from("courses").select("id").eq("instructor_id", userId).in("id", databaseCourseIds),
  ]);

  if (enrollmentResult.error || instructorResult.error) {
    throw new Error("Không thể kiểm tra quyền sở hữu khoá học.");
  }

  return new Set([
    ...(enrollmentResult.data ?? []).map((row) => row.course_id),
    ...(instructorResult.data ?? []).map((row) => row.id),
  ]);
}

function revalidateCart() {
  revalidatePath("/cart");
}

/** Resolve giỏ khách bằng dữ liệu catalog chuẩn ở server. */
export async function resolveGuestCart(
  courseIds: string[],
): Promise<CartActionResult<CartCourse[]>> {
  const parsed = cartCourseIdsSchema.safeParse(courseIds);
  if (!parsed.success) return { error: "Dữ liệu giỏ hàng không hợp lệ." };

  const items = await getCartCoursesByIds([...new Set(parsed.data)]);
  return { data: items.filter((item) => isUuid(item.id)) };
}

export async function addCartItem(
  courseId: string,
): Promise<CartActionResult<{ item: CartCourse; added: boolean }>> {
  const parsed = cartCourseIdSchema.safeParse(courseId);
  if (!parsed.success) return { error: "Khoá học không hợp lệ.", code: "unavailable" };
  if (!isUuid(parsed.data)) {
    return { error: "Khoá học minh hoạ chưa mở bán.", code: "unavailable" };
  }

  const context = await getCartContext();
  if (!context.ok) {
    return { error: context.error, code: "unauthenticated" };
  }

  const item = await getCartCourseById(parsed.data);
  if (!item) {
    return { error: "Khoá học không còn mở bán.", code: "unavailable" };
  }

  try {
    const ownedIds = await getOwnedCourseIds(context.supabase, context.user.id, [item.id]);
    if (ownedIds.has(item.id)) {
      return { error: "Bạn đã sở hữu khoá học này.", code: "already_owned" };
    }
  } catch {
    return { error: "Không thể kiểm tra quyền sở hữu khoá học." };
  }

  const { error } = await context.supabase.from("cart_items").insert({
    user_id: context.user.id,
    course_id: item.id,
  });

  if (error?.code === "23505") {
    return { data: { item, added: false } };
  }
  if (error) {
    return { error: "Không thể thêm khoá học vào giỏ. Vui lòng thử lại." };
  }

  revalidateCart();
  return { data: { item, added: true } };
}

export async function removeCartItem(
  courseId: string,
): Promise<CartActionResult<{ courseId: string }>> {
  const parsed = cartCourseIdSchema.safeParse(courseId);
  if (!parsed.success) return { error: "Khoá học không hợp lệ." };

  const context = await getCartContext();
  if (!context.ok) return { error: context.error, code: "unauthenticated" };

  const { error } = await context.supabase
    .from("cart_items")
    .delete()
    .eq("user_id", context.user.id)
    .eq("course_id", parsed.data);

  if (error) return { error: "Không thể xoá khoá học khỏi giỏ." };
  revalidateCart();
  return { data: { courseId: parsed.data } };
}

export async function clearCartItems(): Promise<CartActionResult<{ cleared: true }>> {
  const context = await getCartContext();
  if (!context.ok) return { error: context.error, code: "unauthenticated" };

  const { error } = await context.supabase
    .from("cart_items")
    .delete()
    .eq("user_id", context.user.id);

  if (error) return { error: "Không thể xoá giỏ hàng." };
  revalidateCart();
  return { data: { cleared: true } };
}

/** Hợp nhất localStorage vào database ngay khi layout nhận ra user đã login. */
export async function syncGuestCart(
  courseIds: string[],
): Promise<CartActionResult<CartSyncResult>> {
  const parsed = cartCourseIdsSchema.safeParse(courseIds);
  if (!parsed.success) return { error: "Dữ liệu giỏ hàng không hợp lệ." };

  const context = await getCartContext();
  if (!context.ok) return { error: context.error, code: "unauthenticated" };

  const guestIds = [...new Set(parsed.data)];
  const { data: existingRows, error: existingError } = await context.supabase
    .from("cart_items")
    .select("course_id")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: true });

  if (existingError) return { error: "Không thể đọc giỏ hàng đã lưu." };

  const existingIds = (existingRows ?? []).map((row) => row.course_id);
  const allIds = [...new Set([...existingIds, ...guestIds])];
  const resolvedItems = (await getCartCoursesByIds(allIds)).filter((item) => isUuid(item.id));
  const availableIds = new Set(resolvedItems.map((item) => item.id));

  let ownedIds: Set<string>;
  try {
    ownedIds = await getOwnedCourseIds(context.supabase, context.user.id, allIds);
  } catch {
    return { error: "Không thể kiểm tra các khoá học đã sở hữu." };
  }

  const validItems = resolvedItems.filter((item) => !ownedIds.has(item.id));
  const validIds = new Set(validItems.map((item) => item.id));
  const staleIds = allIds.filter((id) => !validIds.has(id));

  if (staleIds.length > 0) {
    const { error } = await context.supabase
      .from("cart_items")
      .delete()
      .eq("user_id", context.user.id)
      .in("course_id", staleIds);
    if (error) return { error: "Không thể làm sạch giỏ hàng cũ." };
  }

  if (validItems.length > 0) {
    const { error } = await context.supabase.from("cart_items").upsert(
      validItems.map((item) => ({ user_id: context.user.id, course_id: item.id })),
      { onConflict: "user_id,course_id", ignoreDuplicates: true },
    );
    if (error) return { error: "Không thể đồng bộ giỏ hàng." };
  }

  revalidateCart();
  return {
    data: {
      items: validItems,
      skippedOwned: guestIds.filter((id) => ownedIds.has(id)).length,
      skippedUnavailable: guestIds.filter((id) => !availableIds.has(id)).length,
    },
  };
}
