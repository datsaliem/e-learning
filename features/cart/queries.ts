import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCartCoursesByIds } from "@/features/cart/services";
import type { CartCourse } from "@/features/cart/types";

/** Dữ liệu khởi tạo cho provider; RLS vẫn xác minh user của request. */
export async function getInitialCart(userId: string): Promise<CartCourse[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cart_items")
      .select("course_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return getCartCoursesByIds(data.map((item) => item.course_id));
  } catch {
    return [];
  }
}
