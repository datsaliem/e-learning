"use client";

import { createClient } from "@/lib/supabase/client";
import type { CurriculumLessonType, NewResourceInput } from "@/features/curriculum/types";

const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
const RESOURCE_TYPES = [
  "application/pdf",
  "application/zip",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const;

const VIDEO_MAX_BYTES = 500 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

function safeFileName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-120);

  return normalized || "file";
}

export function validateLessonContentFile(file: File, type: CurriculumLessonType): string | null {
  if (type === "video") {
    if (!(VIDEO_TYPES as readonly string[]).includes(file.type)) {
      return "Video chỉ chấp nhận MP4, WEBM hoặc MOV.";
    }
    if (file.size > VIDEO_MAX_BYTES) return "Video có kích thước tối đa 500MB.";
    return null;
  }

  if (type === "pdf") {
    if (file.type !== "application/pdf") return "Bài học PDF chỉ chấp nhận file PDF.";
    if (file.size > DOCUMENT_MAX_BYTES) return "PDF có kích thước tối đa 50MB.";
    return null;
  }

  return "Loại bài học này không sử dụng file nội dung.";
}

export function validateResourceFile(file: File): string | null {
  if (!(RESOURCE_TYPES as readonly string[]).includes(file.type)) {
    return "Tài liệu chỉ chấp nhận PDF, ZIP, TXT, CSV, DOCX hoặc PPTX.";
  }
  if (file.size > DOCUMENT_MAX_BYTES) return "Mỗi tài liệu có kích thước tối đa 50MB.";
  return null;
}

export async function uploadLessonContent(
  courseId: string,
  lessonId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const path = `${courseId}/lessons/${lessonId}/content/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from("course-content").upload(path, file, {
    upsert: false,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) throw new Error("Không thể tải nội dung bài học lên.");
  return path;
}

export async function uploadLessonResources(
  courseId: string,
  lessonId: string,
  files: File[],
): Promise<NewResourceInput[]> {
  const supabase = createClient();
  const uploaded: NewResourceInput[] = [];

  try {
    for (const file of files) {
      const path = `${courseId}/lessons/${lessonId}/resources/${crypto.randomUUID()}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("course-content").upload(path, file, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });
      if (error) throw new Error("Không thể tải tài liệu bài học lên.");

      uploaded.push({
        name: file.name,
        storagePath: path,
        fileSizeBytes: file.size,
        mimeType: file.type,
      });
    }

    return uploaded;
  } catch (error) {
    if (uploaded.length > 0) {
      await supabase.storage
        .from("course-content")
        .remove(uploaded.map((item) => item.storagePath));
    }
    throw error;
  }
}

export async function removeUploadedContent(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = createClient();
  await supabase.storage.from("course-content").remove(paths);
}
