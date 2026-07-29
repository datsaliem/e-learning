import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OwnedCourseDraft } from "@/features/course-builder/types";
import type {
  CourseStatusAction,
  CourseStatusHistoryItem,
  CourseWorkflowStatus,
} from "@/types/course";

export async function getOwnedCourseDraft(
  courseId: string,
  instructorId: string,
): Promise<OwnedCourseDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, slug, short_description, description, category, level, language, thumbnail_url, trailer_url, price, sale_price, status, submitted_at, published_at, latest_review_feedback, latest_reviewed_at",
    )
    .eq("id", courseId)
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: historyRows } = await supabase
    .from("course_status_history")
    .select("id, from_status, to_status, action, reason, changed_by_role, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  const reviewHistory: CourseStatusHistoryItem[] = (historyRows ?? []).map((history) => ({
    id: history.id,
    fromStatus: history.from_status as CourseWorkflowStatus | null,
    toStatus: history.to_status as CourseWorkflowStatus,
    action: history.action as CourseStatusAction,
    reason: history.reason,
    changedByRole: history.changed_by_role as CourseStatusHistoryItem["changedByRole"],
    createdAt: history.created_at,
  }));

  return {
    id: data.id,
    title: data.title ?? "",
    slug: data.slug ?? "",
    shortDescription: data.short_description ?? "",
    fullDescription: data.description ?? "",
    category: data.category ?? "lap-trinh",
    level: data.level ?? "beginner",
    language: data.language ?? "Tiếng Việt",
    thumbnailUrl: data.thumbnail_url ?? "",
    trailerUrl: data.trailer_url ?? "",
    price: Number(data.price ?? 0),
    salePrice: data.sale_price === null ? undefined : Number(data.sale_price),
    status: data.status,
    submittedAt: data.submitted_at,
    publishedAt: data.published_at,
    latestReviewFeedback: data.latest_review_feedback,
    latestReviewedAt: data.latest_reviewed_at,
    reviewHistory,
  } as OwnedCourseDraft;
}
