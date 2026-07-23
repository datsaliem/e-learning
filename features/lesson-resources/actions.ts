"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  MAX_LESSON_RESOURCES,
  validateLessonContentMetadata,
  validateLessonResourceMetadata,
} from "@/features/lesson-resources/config";
import {
  lessonContentUploadPathSchema,
  lessonResourceUploadIdSchema,
  prepareLessonContentUploadSchema,
  prepareLessonResourceUploadSchema,
  type LessonResourceFileInput,
} from "@/features/lesson-resources/schemas";
import type { CurriculumActionResult, CurriculumResource } from "@/features/curriculum/types";

const BUCKET = "course-content";
const SESSION_ERROR = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
const PERMISSION_ERROR = "Bạn không có quyền quản lý tài liệu của bài học này.";

interface ResourceRow {
  id: string;
  lesson_id: string;
  name: string;
  storage_path: string;
  file_size_bytes: number | string | null;
  mime_type: string | null;
  sort_order: number;
}

function revalidateLessonResources(courseId: string) {
  revalidatePath(`/instructor/courses/${courseId}/edit`);
  revalidatePath("/learn/[courseSlug]/[lessonId]", "page");
}

function safeFileName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);

  return normalized || "file";
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
    storagePath.length > prefix.length &&
    !storagePath.includes("..")
  );
}

function getResumableEndpoint(): string {
  const url = new URL(env.supabaseUrl);
  if (url.hostname.endsWith(".supabase.co") && !url.hostname.endsWith(".storage.supabase.co")) {
    url.hostname = url.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co");
  }
  url.pathname = "/storage/v1/upload/resumable";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function mapResource(row: ResourceRow): CurriculumResource {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    name: row.name,
    storagePath: row.storage_path,
    fileSizeBytes: row.file_size_bytes === null ? null : Number(row.file_size_bytes),
    mimeType: row.mime_type,
    sortOrder: row.sort_order,
  };
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
    return { ok: false, error: "Chỉ giảng viên mới có thể tải tài liệu bài học." } as const;
  }

  return { ok: true, supabase, user } as const;
}

async function ownsLesson(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  courseId: string,
  lessonId: string,
): Promise<boolean> {
  const [{ data: course }, { data: lesson }] = await Promise.all([
    supabase
      .from("courses")
      .select("id")
      .eq("id", courseId)
      .eq("instructor_id", instructorId)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("id")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .maybeSingle(),
  ]);

  return Boolean(course && lesson);
}

async function removeObject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  storagePath: string,
): Promise<boolean> {
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  return !error;
}

export async function prepareLessonResourceUpload(
  courseId: string,
  lessonId: string,
  file: LessonResourceFileInput,
): Promise<
  CurriculumActionResult<{
    resourceId: string;
    storagePath: string;
    uploadToken: string;
    uploadEndpoint: string;
  }>
> {
  const parsed = prepareLessonResourceUploadSchema.safeParse({ courseId, lessonId, file });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "File không hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsLesson(supabase, user.id, courseId, lessonId))) {
    return { error: PERMISSION_ERROR };
  }

  const { count } = await supabase
    .from("lesson_resources")
    .select("id", { count: "exact", head: true })
    .eq("lesson_id", lessonId);
  if ((count ?? 0) >= MAX_LESSON_RESOURCES) {
    return { error: `Mỗi bài học có tối đa ${MAX_LESSON_RESOURCES} tài liệu.` };
  }

  const storagePath = `${courseId}/lessons/${lessonId}/resources/${randomUUID()}-${safeFileName(parsed.data.file.name)}`;
  const { data: lastResource } = await supabase
    .from("lesson_resources")
    .select("sort_order")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (lastResource?.sort_order ?? -1) + 1;

  const { data: resource, error: insertError } = await supabase
    .from("lesson_resources")
    .insert({
      lesson_id: lessonId,
      name: parsed.data.file.name,
      storage_path: storagePath,
      file_size_bytes: parsed.data.file.fileSizeBytes,
      mime_type: parsed.data.file.mimeType,
      sort_order: sortOrder,
      position: sortOrder,
      upload_status: "uploading",
    })
    .select("id")
    .single();

  if (insertError || !resource) {
    return { error: "Không thể khởi tạo lượt tải tài liệu." };
  }

  const { data: signedUpload, error: signedUploadError } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (signedUploadError || !signedUpload) {
    await supabase.from("lesson_resources").delete().eq("id", resource.id);
    return { error: "Không thể tạo URL tải lên an toàn." };
  }

  return {
    data: {
      resourceId: resource.id,
      storagePath,
      uploadToken: signedUpload.token,
      uploadEndpoint: getResumableEndpoint(),
    },
  };
}

export async function completeLessonResourceUpload(
  courseId: string,
  lessonId: string,
  resourceId: string,
): Promise<CurriculumActionResult<CurriculumResource>> {
  const parsed = lessonResourceUploadIdSchema.safeParse({ courseId, lessonId, resourceId });
  if (!parsed.success) return { error: "Lượt tải tài liệu không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsLesson(supabase, user.id, courseId, lessonId))) {
    return { error: PERMISSION_ERROR };
  }

  const { data: resource } = await supabase
    .from("lesson_resources")
    .select(
      "id, lesson_id, name, storage_path, file_size_bytes, mime_type, sort_order, upload_status",
    )
    .eq("id", resourceId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!resource || resource.upload_status !== "uploading") {
    return { error: "Không tìm thấy lượt tải đang chờ hoàn tất." };
  }
  if (!isPathInsideLesson(resource.storage_path, courseId, lessonId, "resources")) {
    return { error: "Đường dẫn tài liệu không hợp lệ." };
  }

  const { data: objectInfo, error: infoError } = await supabase.storage
    .from(BUCKET)
    .info(resource.storage_path);
  const actualSize = objectInfo?.size;
  const actualMimeType = objectInfo?.contentType;
  const metadataError =
    infoError || actualSize === undefined || !actualMimeType
      ? "Không thể xác minh file đã tải lên."
      : validateLessonResourceMetadata({
          name: resource.name,
          mimeType: actualMimeType,
          fileSizeBytes: actualSize,
        });

  if (
    metadataError ||
    actualMimeType !== resource.mime_type ||
    actualSize !== Number(resource.file_size_bytes)
  ) {
    await removeObject(supabase, resource.storage_path);
    await supabase.from("lesson_resources").delete().eq("id", resourceId);
    return { error: metadataError || "Metadata file tải lên không khớp." };
  }

  const { data, error } = await supabase
    .from("lesson_resources")
    .update({
      upload_status: "ready",
      file_size_bytes: actualSize,
      mime_type: actualMimeType,
    })
    .eq("id", resourceId)
    .eq("lesson_id", lessonId)
    .select("id, lesson_id, name, storage_path, file_size_bytes, mime_type, sort_order")
    .single();

  if (error || !data) {
    await removeObject(supabase, resource.storage_path);
    await supabase.from("lesson_resources").delete().eq("id", resourceId);
    return { error: "Không thể lưu metadata tài liệu." };
  }

  revalidateLessonResources(courseId);
  return { data: mapResource(data as ResourceRow) };
}

export async function cancelLessonResourceUpload(
  courseId: string,
  lessonId: string,
  resourceId: string,
): Promise<CurriculumActionResult<{ resourceId: string }>> {
  const parsed = lessonResourceUploadIdSchema.safeParse({ courseId, lessonId, resourceId });
  if (!parsed.success) return { error: "Lượt tải tài liệu không hợp lệ." };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsLesson(supabase, user.id, courseId, lessonId))) {
    return { error: PERMISSION_ERROR };
  }

  const { data: resource } = await supabase
    .from("lesson_resources")
    .select("id, storage_path")
    .eq("id", resourceId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (!resource) return { data: { resourceId } };
  if (!isPathInsideLesson(resource.storage_path, courseId, lessonId, "resources")) {
    return { error: "Đường dẫn tài liệu không hợp lệ." };
  }

  if (!(await removeObject(supabase, resource.storage_path))) {
    return { error: "Không thể xoá file khỏi Storage. Vui lòng thử lại." };
  }
  const { error } = await supabase.from("lesson_resources").delete().eq("id", resourceId);
  if (error) return { error: "Không thể huỷ lượt tải tài liệu." };

  revalidateLessonResources(courseId);
  return { data: { resourceId } };
}

export async function deleteLessonResourceFile(
  courseId: string,
  lessonId: string,
  resourceId: string,
): Promise<CurriculumActionResult<{ resourceId: string }>> {
  return cancelLessonResourceUpload(courseId, lessonId, resourceId);
}

export async function prepareLessonContentUpload(
  courseId: string,
  lessonId: string,
  lessonType: "video" | "pdf",
  file: LessonResourceFileInput,
): Promise<
  CurriculumActionResult<{
    storagePath: string;
    uploadToken: string;
    uploadEndpoint: string;
  }>
> {
  const parsed = prepareLessonContentUploadSchema.safeParse({
    courseId,
    lessonId,
    lessonType,
    file,
  });
  if (!parsed.success) return { error: "File nội dung không hợp lệ." };

  const metadataError = validateLessonContentMetadata(parsed.data.file, lessonType);
  if (metadataError) return { error: metadataError };

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsLesson(supabase, user.id, courseId, lessonId))) {
    return { error: PERMISSION_ERROR };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("lesson_type")
    .eq("id", lessonId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!lesson || lesson.lesson_type !== lessonType) {
    return { error: "Loại file không khớp với bài học." };
  }

  const storagePath = `${courseId}/lessons/${lessonId}/content/${randomUUID()}-${safeFileName(parsed.data.file.name)}`;
  const { data: signedUpload, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });
  if (error || !signedUpload) return { error: "Không thể tạo URL tải lên an toàn." };

  return {
    data: {
      storagePath,
      uploadToken: signedUpload.token,
      uploadEndpoint: getResumableEndpoint(),
    },
  };
}

export async function cancelLessonContentUpload(
  courseId: string,
  lessonId: string,
  storagePath: string,
): Promise<CurriculumActionResult<{ storagePath: string }>> {
  const parsed = lessonContentUploadPathSchema.safeParse({ courseId, lessonId, storagePath });
  if (!parsed.success || !isPathInsideLesson(storagePath, courseId, lessonId, "content")) {
    return { error: "Đường dẫn file nội dung không hợp lệ." };
  }

  const context = await getInstructorContext();
  if (!context.ok) return { error: context.error };
  const { supabase, user } = context;
  if (!(await ownsLesson(supabase, user.id, courseId, lessonId))) {
    return { error: PERMISSION_ERROR };
  }

  if (!(await removeObject(supabase, storagePath))) {
    return { error: "Không thể xoá file tải lên dở dang." };
  }
  return { data: { storagePath } };
}
