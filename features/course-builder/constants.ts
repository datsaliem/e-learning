import type { CourseLevel } from "@/features/courses/types";

export type CourseMediaKind = "thumbnail" | "trailer";

export const COURSE_CATEGORY_OPTIONS = [
  { value: "lap-trinh", label: "Lập trình" },
  { value: "thiet-ke", label: "Thiết kế" },
  { value: "kinh-doanh", label: "Kinh doanh" },
  { value: "marketing", label: "Marketing" },
  { value: "ngoai-ngu", label: "Ngoại ngữ" },
  { value: "ky-nang-mem", label: "Kỹ năng mềm" },
] as const;

export const COURSE_LEVEL_OPTIONS: Array<{ value: CourseLevel; label: string }> = [
  { value: "beginner", label: "Cơ bản" },
  { value: "intermediate", label: "Trung cấp" },
  { value: "advanced", label: "Nâng cao" },
];

export const COURSE_LANGUAGE_OPTIONS = ["Tiếng Việt", "Tiếng Anh", "Song ngữ"] as const;

export const THUMBNAIL_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const TRAILER_MAX_SIZE_BYTES = 200 * 1024 * 1024;

export const THUMBNAIL_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const TRAILER_ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
