"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/queries";
import type { LessonProgressMutationResult } from "@/features/learn/types";

const progressInputSchema = z.object({
  courseId: z.uuid(),
  lessonId: z.uuid(),
  watchedSeconds: z.number().int().min(0).max(86400),
});

/**
 * Chỉ gửi watched_seconds. Hàm Postgres xác minh role, enrollment, quan hệ
 * course/lesson và tự tính completed để client không thể tự đánh dấu gian lận.
 */
export async function saveLessonProgress(input: {
  courseId: string;
  lessonId: string;
  watchedSeconds: number;
}): Promise<LessonProgressMutationResult> {
  const parsed = progressInputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu tiến độ không hợp lệ." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  if (user.role !== "student") {
    return { error: "Chỉ học viên mới có thể lưu tiến độ học." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_lesson_watch_progress", {
    target_course_id: parsed.data.courseId,
    target_lesson_id: parsed.data.lessonId,
    new_watched_seconds: parsed.data.watchedSeconds,
  });

  const saved = data?.[0];
  if (error || !saved) {
    return { error: "Không thể lưu tiến độ. Vui lòng kiểm tra quyền ghi danh." };
  }

  if (saved.is_completed) {
    revalidatePath("/my-courses");
  }

  return {
    data: {
      watchedSeconds: saved.saved_watched_seconds,
      completed: saved.is_completed,
    },
  };
}
