import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  LearningLessonSummary,
  LearningPageResult,
  LearningResource,
  LearningSection,
  LessonProgressEntry,
} from "@/features/learn/types";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Tài liệu";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Tải toàn bộ dữ liệu learning page sau khi đã kiểm tra enrollment còn hiệu lực.
 * Mọi query tiếp theo vẫn chịu RLS; signed URL cho video/tài liệu chỉ sống 1 giờ.
 */
export async function getLearningPageData(
  courseSlug: string,
  lessonId: string,
  studentId: string,
): Promise<LearningPageResult> {
  const supabase = await createClient();
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (courseError || !course) {
    return { access: "not_found" };
  }

  const { data: enrollment, error: enrollmentError } = await supabase
    .from("enrollments")
    .select("id, expires_at")
    .eq("course_id", course.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (enrollmentError || !enrollment) {
    return { access: "not_enrolled", courseSlug: course.slug };
  }

  if (enrollment.expires_at && new Date(enrollment.expires_at).getTime() <= Date.now()) {
    return { access: "expired", courseSlug: course.slug };
  }

  const [{ data: sectionRows }, { data: lessonRows, error: lessonsError }] = await Promise.all([
    supabase
      .from("course_sections")
      .select("id, title, sort_order")
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true }),
    supabase
      .from("lessons")
      .select(
        "id, section_id, title, content, lesson_type, video_path, content_path, external_url, duration_seconds, sort_order",
      )
      .eq("course_id", course.id)
      .order("sort_order", { ascending: true }),
  ]);

  if (lessonsError || !lessonRows) {
    return { access: "not_found" };
  }

  const currentRow = lessonRows.find((lesson) => lesson.id === lessonId);
  if (!currentRow) {
    return { access: "not_found" };
  }

  const sectionById = new Map<string, LearningSection>();
  for (const section of sectionRows ?? []) {
    sectionById.set(section.id, { id: section.id, title: section.title, lessons: [] });
  }

  const ungroupedSection: LearningSection = {
    id: `course-${course.id}`,
    title: "Nội dung khoá học",
    lessons: [],
  };

  for (const lesson of lessonRows) {
    const summary: LearningLessonSummary = {
      id: lesson.id,
      title: lesson.title,
      type: lesson.lesson_type,
      durationSeconds: lesson.duration_seconds,
    };
    const section = lesson.section_id ? sectionById.get(lesson.section_id) : undefined;
    (section ?? ungroupedSection).lessons.push(summary);
  }

  const sections = [...sectionById.values()].filter((section) => section.lessons.length > 0);
  if (ungroupedSection.lessons.length > 0) sections.push(ungroupedSection);

  const orderedLessons = sections.flatMap((section) => section.lessons);
  const currentIndex = orderedLessons.findIndex((lesson) => lesson.id === lessonId);
  if (currentIndex < 0) {
    return { access: "not_found" };
  }

  const [{ data: progressRows }, { data: resourceRows }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed, watched_seconds")
      .eq("student_id", studentId)
      .eq("course_id", course.id),
    supabase
      .from("lesson_resources")
      .select("id, name, storage_path, file_size_bytes, mime_type, sort_order")
      .eq("lesson_id", lessonId)
      .eq("upload_status", "ready")
      .order("sort_order", { ascending: true }),
  ]);

  const progressMap: Record<string, LessonProgressEntry> = {};
  for (const row of progressRows ?? []) {
    progressMap[row.lesson_id] = {
      lessonId: row.lesson_id,
      completed: row.completed,
      watchedSeconds: row.watched_seconds,
    };
  }

  let videoUrl: string | null = null;
  if (currentRow.lesson_type === "video" && currentRow.video_path) {
    const { data } = await supabase.storage
      .from("course-content")
      .createSignedUrl(currentRow.video_path, 60 * 60);
    videoUrl = data?.signedUrl ?? null;
  }

  let documentUrl: string | null = null;
  if (currentRow.lesson_type === "pdf" && currentRow.content_path) {
    const { data } = await supabase.storage
      .from("course-content")
      .createSignedUrl(currentRow.content_path, 60 * 60);
    documentUrl = data?.signedUrl ?? null;
  }

  const resources = (
    await Promise.all(
      (resourceRows ?? []).map(async (resource): Promise<LearningResource | null> => {
        const { data } = await supabase.storage
          .from("course-content")
          .createSignedUrl(resource.storage_path, 60 * 60);

        if (!data?.signedUrl) return null;

        return {
          id: resource.id,
          name: resource.name,
          downloadUrl: data.signedUrl,
          fileLabel: [
            resource.mime_type?.split("/").at(-1)?.toUpperCase(),
            formatFileSize(resource.file_size_bytes),
          ]
            .filter(Boolean)
            .join(" · "),
        };
      }),
    )
  ).filter((resource): resource is LearningResource => resource !== null);

  const initialProgress = progressMap[lessonId];

  return {
    access: "granted",
    data: {
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      sections,
      lesson: {
        id: currentRow.id,
        title: currentRow.title,
        type: currentRow.lesson_type,
        content: currentRow.content,
        videoUrl,
        documentUrl,
        externalUrl: currentRow.external_url,
        durationSeconds: currentRow.duration_seconds,
        resources,
      },
      progressMap,
      initialWatchedSeconds: initialProgress?.watchedSeconds ?? 0,
      initialCompleted: initialProgress?.completed ?? false,
      previousLesson:
        currentIndex > 0
          ? {
              id: orderedLessons[currentIndex - 1].id,
              title: orderedLessons[currentIndex - 1].title,
            }
          : null,
      nextLesson:
        currentIndex < orderedLessons.length - 1
          ? {
              id: orderedLessons[currentIndex + 1].id,
              title: orderedLessons[currentIndex + 1].title,
            }
          : null,
    },
  };
}
