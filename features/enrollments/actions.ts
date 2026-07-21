"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/queries";
import type { ActionResult } from "@/types/actions";

/**
 * Ghi danh khoá học miễn phí, hoặc bắt đầu quy trình "mua" cho khoá trả phí.
 * Dự án chưa tích hợp cổng thanh toán — với khoá trả phí, hành động này ghi
 * danh trực tiếp; khi có cổng thanh toán thật, đây là chỗ điều hướng sang
 * bước checkout trước khi insert enrollment.
 */
export async function enrollInCourse(courseId: string, courseSlug: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const supabase = await createClient();
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
}
