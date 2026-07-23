import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  CurriculumLesson,
  CurriculumLessonType,
  CurriculumResource,
  CurriculumSection,
} from "@/features/curriculum/types";

export async function getOwnedCourseCurriculum(
  courseId: string,
  instructorId: string,
): Promise<CurriculumSection[]> {
  const supabase = await createClient();
  const { data: ownedCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (!ownedCourse) return [];

  const [{ data: sectionRows, error: sectionError }, { data: lessonRows, error: lessonError }] =
    await Promise.all([
      supabase
        .from("course_sections")
        .select("id, course_id, title, sort_order")
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("lessons")
        .select(
          "id, section_id, title, content, lesson_type, video_path, content_path, external_url, duration_seconds, is_preview, sort_order",
        )
        .eq("course_id", courseId)
        .order("sort_order", { ascending: true }),
    ]);

  if (sectionError || lessonError || !sectionRows || !lessonRows) return [];

  const lessonIds = lessonRows.map((lesson) => lesson.id);
  const resourceRows =
    lessonIds.length === 0
      ? []
      : ((
          await supabase
            .from("lesson_resources")
            .select("id, lesson_id, name, storage_path, file_size_bytes, mime_type, sort_order")
            .in("lesson_id", lessonIds)
            .eq("upload_status", "ready")
            .order("sort_order", { ascending: true })
        ).data ?? []);

  const resourcesByLesson = new Map<string, CurriculumResource[]>();
  for (const resource of resourceRows) {
    const mapped: CurriculumResource = {
      id: resource.id,
      lessonId: resource.lesson_id,
      name: resource.name,
      storagePath: resource.storage_path,
      fileSizeBytes: resource.file_size_bytes === null ? null : Number(resource.file_size_bytes),
      mimeType: resource.mime_type,
      sortOrder: resource.sort_order,
    };
    const resources = resourcesByLesson.get(resource.lesson_id) ?? [];
    resources.push(mapped);
    resourcesByLesson.set(resource.lesson_id, resources);
  }

  const lessonsBySection = new Map<string, CurriculumLesson[]>();
  for (const lesson of lessonRows) {
    const mapped: CurriculumLesson = {
      id: lesson.id,
      sectionId: lesson.section_id,
      title: lesson.title,
      type: lesson.lesson_type as CurriculumLessonType,
      content: lesson.content ?? "",
      videoPath: lesson.video_path,
      contentPath: lesson.content_path,
      externalUrl: lesson.external_url ?? "",
      durationSeconds: lesson.duration_seconds,
      isPreview: lesson.is_preview,
      sortOrder: lesson.sort_order,
      resources: resourcesByLesson.get(lesson.id) ?? [],
    };
    const lessons = lessonsBySection.get(lesson.section_id) ?? [];
    lessons.push(mapped);
    lessonsBySection.set(lesson.section_id, lessons);
  }

  return sectionRows.map((section) => ({
    id: section.id,
    courseId: section.course_id,
    title: section.title,
    sortOrder: section.sort_order,
    lessons: lessonsBySection.get(section.id) ?? [],
  }));
}
