"use client";

import { createClient } from "@/lib/supabase/client";
import type { CourseMediaKind } from "@/features/course-builder/constants";

export async function uploadCourseMedia(
  courseId: string,
  kind: CourseMediaKind,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const path = `${courseId}/${kind}`;
  const { error } = await supabase.storage.from("course-media").upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(`Không thể tải ${kind === "thumbnail" ? "thumbnail" : "trailer"} lên.`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("course-media").getPublicUrl(path);

  return `${publicUrl}?v=${Date.now()}`;
}
