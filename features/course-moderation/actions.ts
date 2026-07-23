"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  moderationActionSchema,
  type ModerationActionInput,
} from "@/features/course-moderation/schemas";
import type {
  ModerationActionResult,
  ModerationDecision,
} from "@/features/course-moderation/types";

const DECISION_STATUS = {
  approve: "published",
  request_changes: "changes_requested",
  reject: "rejected",
} as const satisfies Record<ModerationDecision, string>;

export async function moderateCourse(
  input: ModerationActionInput,
): Promise<ModerationActionResult> {
  const parsed = moderationActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Dữ liệu kiểm duyệt không hợp lệ.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { error: "Chỉ quản trị viên mới có quyền kiểm duyệt khóa học." };
  }

  const nextStatus = DECISION_STATUS[parsed.data.decision];
  const feedback = parsed.data.decision === "approve" ? null : (parsed.data.reason?.trim() ?? null);
  const { data, error } = await supabase
    .from("courses")
    .update({
      status: nextStatus,
      latest_review_feedback: feedback,
    })
    .eq("id", parsed.data.courseId)
    .eq("status", "pending_review")
    .select("id, slug, status, latest_review_feedback, latest_reviewed_at, published_at")
    .maybeSingle();

  if (error) {
    return {
      error:
        error.code === "22023"
          ? "Chuyển trạng thái không hợp lệ hoặc lý do chưa đủ chi tiết."
          : "Không thể cập nhật trạng thái khóa học. Vui lòng thử lại.",
    };
  }

  if (!data || !data.latest_reviewed_at) {
    return {
      error: "Khóa học không còn ở trạng thái chờ duyệt. Hãy tải lại danh sách.",
    };
  }

  revalidatePath("/admin/courses");
  revalidatePath("/admin/dashboard");
  revalidatePath(`/instructor/courses/${data.id}/edit`);
  revalidatePath("/instructor/dashboard");
  if (data.slug) revalidatePath(`/courses/${data.slug}`);

  return {
    data: {
      courseId: data.id,
      status: nextStatus,
      feedback: data.latest_review_feedback,
      reviewedAt: data.latest_reviewed_at,
      publishedAt: data.published_at,
    },
  };
}
