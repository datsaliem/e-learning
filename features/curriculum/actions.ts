"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  lessonContentSchema,
  lessonMutationSchema,
  sectionSchema,
  type LessonFormInput,
} from "@/features/curriculum/schemas";
import type {
  CurriculumActionResult,
  CurriculumLessonType,
  LessonContentMutationInput,
  LessonMutationData,
} from "@/features/curriculum/types";
import { validateLessonContentMetadata } from "@/features/lesson-resources/config";
import { isEditableCourseStatus, type CourseWorkflowStatus } from "@/types/course";

const SESSION_ERROR = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
const PERMISSION_ERROR = "Bạn không có quyền quản lý nội dung khoá học này.";

interface LessonRow {
  id: string;
  section_id: string;
  title: string;
  content: string | null;
  lesson_type: string;
  video_path: string | null;
  content_path: string | null;
  external_url: string | null;
  duration_seconds: number;
  is_preview: boolean;
  sort_order: number;
}

async function getInstructorContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: SESSION_ERROR } as const;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "instructor") {
    return { ok: false, error: "Chỉ giảng viên mới có thể quản lý curriculum." } as const;
  }

  return { ok: true, supabase, user } as const;
}

function revalidateCurriculum(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}/edit`);
  revalidatePath("/courses/[slug]", "page");
  revalidatePath("/learn/[courseSlug]/[lessonId]", "page");
}

function mapLessonRow(row: LessonRow): LessonMutationData {
  return {
    id: row.id,
    sectionId: row.section_id,
    title: row.title,
    type: row.lesson_type as CurriculumLessonType,
    content: row.content ?? "",
    videoPath: row.video_path,
    contentPath: row.content_path,
    externalUrl: row.external_url ?? "",
    durationSeconds: row.duration_seconds,
    isPreview: row.is_preview,
    sortOrder: row.sort_order,
  };
}

function isPathInsideLesson(
  storagePath: string,
  courseId: string,
  lessonId: string,
  folder: "content" | "resources",
): boolean {
  const prefix = `${courseId}/lessons/${lessonId}/${folder}/`;
  return (
    storagePath.startsWith(prefix) &&
    !storagePath.includes("..") &&
    storagePath.length > prefix.length
  );
}

async function removeStoragePaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length === 0) return;
  await supabase.storage.from("course-content").remove(paths);
}

async function removeLessonStorage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  lessonId: string,
) {
  const base = `${courseId}/lessons/${lessonId}`;
  const [contentResult, resourceResult] = await Promise.all([
    supabase.storage.from("course-content").list(`${base}/content`, { limit: 1000 }),
    supabase.storage.from("course-content").list(`${base}/resources`, { limit: 1000 }),
  ]);

  const paths = [
    ...(contentResult.data ?? [])
      .filter((item) => item.id)
      .map((item) => `${base}/content/${item.name}`),
    ...(resourceResult.data ?? [])
      .filter((item) => item.id)
      .map((item) => `${base}/resources/${item.name}`),
  ];
  await removeStoragePaths(supabase, paths);
}

async function ownsCourse(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  instructorId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", courseId)
    .eq("instructor_id", instructorId)
    .maybeSingle();
  return Boolean(data && isEditableCourseStatus(data.status as CourseWorkflowStatus));
}

export async function createSection(
  courseId: string,
  title: string,
): Promise<CurriculumActionResult<{ id: string; title: string; sortOrder: number }>> {
  const parsed = sectionSchema.safeParse({ courseId, title });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Section không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;

  if (!(await ownsCourse(supabase, parsed.data.courseId, user.id))) {
    return { error: PERMISSION_ERROR };
  }

  const { data: lastSection } = await supabase
    .from("course_sections")
    .select("sort_order")
    .eq("course_id", parsed.data.courseId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (lastSection?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("course_sections")
    .insert({
      course_id: parsed.data.courseId,
      title: parsed.data.title,
      sort_order: sortOrder,
      position: sortOrder,
    })
    .select("id, title, sort_order")
    .single();

  if (error || !data) return { error: "Không thể tạo section. Vui lòng thử lại." };
  revalidateCurriculum(courseId);
  return { data: { id: data.id, title: data.title, sortOrder: data.sort_order } };
}

export async function updateSection(
  courseId: string,
  sectionId: string,
  title: string,
): Promise<CurriculumActionResult<{ id: string; title: string }>> {
  const parsed = sectionSchema.safeParse({ courseId, title });
  const sectionIdResult = z.string().uuid().safeParse(sectionId);
  if (!parsed.success || !sectionIdResult.success) return { error: "Section không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { data, error } = await context.supabase
    .from("course_sections")
    .update({ title: parsed.data.title })
    .eq("id", sectionIdResult.data)
    .eq("course_id", parsed.data.courseId)
    .select("id, title")
    .maybeSingle();

  if (error) return { error: "Không thể cập nhật section." };
  if (!data) return { error: PERMISSION_ERROR };
  revalidateCurriculum(courseId);
  return { data };
}

export async function deleteSection(
  courseId: string,
  sectionId: string,
): Promise<CurriculumActionResult<{ sectionId: string }>> {
  const ids = z.object({ courseId: z.string().uuid(), sectionId: z.string().uuid() }).safeParse({
    courseId,
    sectionId,
  });
  if (!ids.success) return { error: "Section không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase } = context;
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id")
    .eq("course_id", courseId)
    .eq("section_id", sectionId);

  const { data, error } = await supabase
    .from("course_sections")
    .delete()
    .eq("id", sectionId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error) return { error: "Không thể xoá section." };
  if (!data) return { error: PERMISSION_ERROR };

  await Promise.all(
    (lessons ?? []).map((lesson) => removeLessonStorage(supabase, courseId, lesson.id)),
  );
  revalidateCurriculum(courseId);
  return { data: { sectionId } };
}

export async function saveLesson(
  courseId: string,
  lessonId: string | null,
  values: LessonFormInput,
): Promise<CurriculumActionResult<LessonMutationData>> {
  const parsed = lessonMutationSchema.safeParse({ courseId, lessonId, values });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu bài học chưa hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsCourse(supabase, courseId, user.id))) return { error: PERMISSION_ERROR };

  const { data: section } = await supabase
    .from("course_sections")
    .select("id")
    .eq("id", parsed.data.values.sectionId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!section) return { error: "Section không thuộc khoá học này." };

  let current: (LessonRow & { course_id: string }) | null = null;
  if (lessonId) {
    const result = await supabase
      .from("lessons")
      .select(
        "id, course_id, section_id, title, content, lesson_type, video_path, content_path, external_url, duration_seconds, is_preview, sort_order",
      )
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle();
    current = result.data as (LessonRow & { course_id: string }) | null;
    if (!current) return { error: PERMISSION_ERROR };
  }

  const lessonType = parsed.data.values.lessonType;
  const lessonValues = {
    section_id: parsed.data.values.sectionId,
    title: parsed.data.values.title.trim(),
    lesson_type: lessonType,
    duration_seconds: parsed.data.values.durationMinutes * 60,
    is_preview: parsed.data.values.isPreview,
    content: lessonType === "text" ? parsed.data.values.content.trim() : null,
    external_url: lessonType === "external_link" ? parsed.data.values.externalUrl.trim() : null,
    video_path: lessonType === "video" ? (current?.video_path ?? null) : null,
    content_path: lessonType === "pdf" ? (current?.content_path ?? null) : null,
  };

  let row: LessonRow | null = null;
  let error: { message: string } | null = null;
  if (lessonId) {
    const result = await supabase
      .from("lessons")
      .update(lessonValues)
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .select(
        "id, section_id, title, content, lesson_type, video_path, content_path, external_url, duration_seconds, is_preview, sort_order",
      )
      .maybeSingle();
    row = result.data as LessonRow | null;
    error = result.error;
  } else {
    const { data: lastLesson } = await supabase
      .from("lessons")
      .select("sort_order")
      .eq("section_id", parsed.data.values.sectionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const sortOrder = (lastLesson?.sort_order ?? -1) + 1;
    const result = await supabase
      .from("lessons")
      .insert({
        ...lessonValues,
        course_id: courseId,
        sort_order: sortOrder,
        position: sortOrder,
      })
      .select(
        "id, section_id, title, content, lesson_type, video_path, content_path, external_url, duration_seconds, is_preview, sort_order",
      )
      .single();
    row = result.data as LessonRow | null;
    error = result.error;
  }

  if (error || !row) return { error: "Không thể lưu bài học. Vui lòng thử lại." };

  const stalePaths = [
    current?.video_path && lessonType !== "video" ? current.video_path : null,
    current?.content_path && lessonType !== "pdf" ? current.content_path : null,
  ].filter((path): path is string => Boolean(path));
  await removeStoragePaths(supabase, stalePaths);

  revalidateCurriculum(courseId);
  return { data: mapLessonRow(row) };
}

export async function updateLessonContent(
  courseId: string,
  lessonId: string,
  input: LessonContentMutationInput,
): Promise<CurriculumActionResult<{ storagePath: string }>> {
  const parsed = lessonContentSchema.safeParse({ courseId, lessonId, input });
  if (!parsed.success) return { error: "File nội dung không hợp lệ." };
  if (!isPathInsideLesson(input.storagePath, courseId, lessonId, "content")) {
    return { error: "Đường dẫn file nội dung không hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsCourse(supabase, courseId, user.id))) return { error: PERMISSION_ERROR };

  const { data: lesson } = await supabase
    .from("lessons")
    .select("lesson_type, video_path, content_path")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!lesson || lesson.lesson_type !== input.lessonType) {
    return { error: "Loại file không khớp với bài học." };
  }

  const { data: objectInfo, error: infoError } = await supabase.storage
    .from("course-content")
    .info(input.storagePath);
  const fileName = input.storagePath.split("/").at(-1) ?? "file";
  const metadataError =
    infoError || objectInfo?.size === undefined || !objectInfo.contentType
      ? "Không thể xác minh file nội dung đã tải lên."
      : validateLessonContentMetadata(
          {
            name: fileName,
            mimeType: objectInfo.contentType,
            fileSizeBytes: objectInfo.size,
          },
          input.lessonType,
        );
  if (metadataError) {
    await removeStoragePaths(supabase, [input.storagePath]);
    return { error: metadataError };
  }

  const oldPath = input.lessonType === "video" ? lesson.video_path : lesson.content_path;
  const values =
    input.lessonType === "video"
      ? { video_path: input.storagePath }
      : { content_path: input.storagePath };
  const { data, error } = await supabase
    .from("lessons")
    .update(values)
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Không thể liên kết file với bài học." };
  if (oldPath && oldPath !== input.storagePath) await removeStoragePaths(supabase, [oldPath]);

  revalidateCurriculum(courseId);
  return { data: { storagePath: input.storagePath } };
}

export async function deleteLesson(
  courseId: string,
  lessonId: string,
): Promise<CurriculumActionResult<{ lessonId: string }>> {
  const ids = z.object({ courseId: z.string().uuid(), lessonId: z.string().uuid() }).safeParse({
    courseId,
    lessonId,
  });
  if (!ids.success) return { error: "Bài học không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase } = context;
  const { data, error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .select("id")
    .maybeSingle();

  if (error) return { error: "Không thể xoá bài học." };
  if (!data) return { error: PERMISSION_ERROR };
  await removeLessonStorage(supabase, courseId, lessonId);

  revalidateCurriculum(courseId);
  return { data: { lessonId } };
}

export async function reorderSections(
  courseId: string,
  sectionIds: string[],
): Promise<CurriculumActionResult<{ sectionIds: string[] }>> {
  const parsed = z
    .object({ courseId: z.string().uuid(), sectionIds: z.array(z.string().uuid()) })
    .safeParse({ courseId, sectionIds });
  if (!parsed.success || new Set(sectionIds).size !== sectionIds.length) {
    return { error: "Thứ tự section không hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { error } = await context.supabase.rpc("reorder_course_sections", {
    target_course_id: courseId,
    ordered_section_ids: sectionIds,
  });
  if (error) return { error: "Không thể lưu thứ tự section." };

  revalidateCurriculum(courseId);
  return { data: { sectionIds } };
}

export async function reorderLessons(
  courseId: string,
  sections: { sectionId: string; lessonIds: string[] }[],
): Promise<CurriculumActionResult<{ saved: true }>> {
  const parsed = z
    .object({
      courseId: z.string().uuid(),
      sections: z.array(
        z.object({ sectionId: z.string().uuid(), lessonIds: z.array(z.string().uuid()) }),
      ),
    })
    .safeParse({ courseId, sections });
  const allLessonIds = sections.flatMap((section) => section.lessonIds);
  if (!parsed.success || new Set(allLessonIds).size !== allLessonIds.length) {
    return { error: "Thứ tự bài học không hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { error } = await context.supabase.rpc("reorder_course_lessons", {
    target_course_id: courseId,
    section_payload: sections.map((section) => ({
      section_id: section.sectionId,
      lesson_ids: section.lessonIds,
    })),
  });
  if (error) return { error: "Không thể lưu thứ tự bài học." };

  revalidateCurriculum(courseId);
  return { data: { saved: true } };
}
