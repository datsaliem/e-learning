import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ModerationCourse } from "@/features/course-moderation/types";
import type {
  CourseStatusAction,
  CourseStatusHistoryItem,
  CourseWorkflowStatus,
} from "@/types/course";

const MODERATION_STATUSES: CourseWorkflowStatus[] = [
  "draft",
  "pending_review",
  "changes_requested",
  "published",
  "rejected",
];

export async function getCoursesForModeration(): Promise<ModerationCourse[]> {
  const supabase = await createClient();
  const { data: courseRows, error: courseError } = await supabase
    .from("courses")
    .select(
      "id, instructor_id, title, slug, short_description, description, category, level, language, thumbnail_url, trailer_url, price, sale_price, status, submitted_at, published_at, latest_review_feedback, latest_reviewed_at, created_at, updated_at",
    )
    .in("status", MODERATION_STATUSES)
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });

  if (courseError || !courseRows) {
    throw new Error("Không thể tải danh sách khóa học kiểm duyệt.");
  }

  if (courseRows.length === 0) return [];

  const courseIds = courseRows.map((course) => course.id);
  const instructorIds = [...new Set(courseRows.map((course) => course.instructor_id))];
  const [profilesResult, sectionsResult, lessonsResult, historyResult] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url, headline").in("id", instructorIds),
    supabase.from("course_sections").select("id, course_id").in("course_id", courseIds),
    supabase.from("lessons").select("id, course_id, duration_seconds").in("course_id", courseIds),
    supabase
      .from("course_status_history")
      .select("id, course_id, from_status, to_status, action, reason, changed_by_role, created_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false }),
  ]);

  if (profilesResult.error || sectionsResult.error || lessonsResult.error || historyResult.error) {
    throw new Error("Không thể tải đầy đủ dữ liệu kiểm duyệt khóa học.");
  }

  const profilesById = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
  const sectionCountByCourse = new Map<string, number>();
  for (const section of sectionsResult.data ?? []) {
    sectionCountByCourse.set(
      section.course_id,
      (sectionCountByCourse.get(section.course_id) ?? 0) + 1,
    );
  }

  const lessonSummaryByCourse = new Map<
    string,
    { lessonCount: number; totalDurationSeconds: number }
  >();
  for (const lesson of lessonsResult.data ?? []) {
    const current = lessonSummaryByCourse.get(lesson.course_id) ?? {
      lessonCount: 0,
      totalDurationSeconds: 0,
    };
    current.lessonCount += 1;
    current.totalDurationSeconds += Number(lesson.duration_seconds ?? 0);
    lessonSummaryByCourse.set(lesson.course_id, current);
  }

  const historyByCourse = new Map<string, CourseStatusHistoryItem[]>();
  for (const history of historyResult.data ?? []) {
    const item: CourseStatusHistoryItem = {
      id: history.id,
      fromStatus: history.from_status as CourseWorkflowStatus | null,
      toStatus: history.to_status as CourseWorkflowStatus,
      action: history.action as CourseStatusAction,
      reason: history.reason,
      changedByRole: history.changed_by_role as CourseStatusHistoryItem["changedByRole"],
      createdAt: history.created_at,
    };
    const items = historyByCourse.get(history.course_id) ?? [];
    items.push(item);
    historyByCourse.set(history.course_id, items);
  }

  return courseRows.map((course) => {
    const profile = profilesById.get(course.instructor_id);
    const lessonSummary = lessonSummaryByCourse.get(course.id);

    return {
      id: course.id,
      instructor: {
        id: course.instructor_id,
        fullName: profile?.full_name?.trim() || "Giảng viên chưa cập nhật tên",
        avatarUrl: profile?.avatar_url ?? null,
        headline: profile?.headline ?? null,
      },
      title: course.title,
      slug: course.slug ?? "",
      shortDescription: course.short_description ?? "",
      fullDescription: course.description ?? "",
      category: course.category ?? "",
      level: course.level ?? "beginner",
      language: course.language ?? "Tiếng Việt",
      thumbnailUrl: course.thumbnail_url,
      trailerUrl: course.trailer_url,
      price: Number(course.price ?? 0),
      salePrice: course.sale_price === null ? null : Number(course.sale_price),
      status: course.status as CourseWorkflowStatus,
      submittedAt: course.submitted_at,
      publishedAt: course.published_at,
      latestReviewFeedback: course.latest_review_feedback,
      latestReviewedAt: course.latest_reviewed_at,
      createdAt: course.created_at,
      updatedAt: course.updated_at,
      sectionCount: sectionCountByCourse.get(course.id) ?? 0,
      lessonCount: lessonSummary?.lessonCount ?? 0,
      totalDurationSeconds: lessonSummary?.totalDurationSeconds ?? 0,
      history: historyByCourse.get(course.id) ?? [],
    };
  });
}
