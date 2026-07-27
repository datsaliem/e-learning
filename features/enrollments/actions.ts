"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { getCurrentUser } from "@/features/auth/queries";
import type { ActionResult } from "@/types/actions";

/**
 * Ghi danh trực tiếp chỉ dành cho khoá học thật, đã xuất bản và miễn phí.
 * Khoá trả phí chỉ được tạo enrollment sau webhook thanh toán đã xác minh.
 */
export async function enrollInCourse(courseId: string, courseSlug: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!isUuid(courseId)) {
    return {
      error: "Khoá học minh hoạ chưa mở ghi danh. Vui lòng chọn khoá học đã được xuất bản.",
    };
  }

  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, price, sale_price")
    .eq("id", courseId)
    .eq("status", "published")
    .maybeSingle();

  if (courseError || !course) {
    return { error: "Khoá học không còn mở ghi danh." };
  }

  if (Number(course.sale_price ?? course.price) > 0) {
    return { error: "Khoá học trả phí cần được thanh toán trước khi ghi danh." };
  }

  const { error } = await supabase
    .from("enrollments")
    .insert({ course_id: courseId, student_id: user.id });

  if (error) {
    // 23505 = unique_violation: đã ghi danh từ trước, không coi là lỗi.
    if (error.code === "23505") {
      revalidatePath(`/courses/${courseSlug}`);
      return;
    }
    return { error: "Không thể ghi danh khoá học. Vui lòng thử lại." };
  }

  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath("/my-courses");
  revalidatePath("/dashboard");
}
