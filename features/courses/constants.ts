import type { CourseLevel } from "@/features/courses/types";

export const LEVEL_LABEL: Record<CourseLevel, string> = {
  beginner: "Cơ bản",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
};

/** Gradient placeholder theo danh mục — dự án chưa có ảnh bìa khoá học thật. */
export const CATEGORY_GRADIENT: Record<string, string> = {
  "lap-trinh": "from-indigo-500 to-blue-500",
  "thiet-ke": "from-fuchsia-500 to-pink-500",
  "kinh-doanh": "from-amber-500 to-orange-500",
  marketing: "from-teal-500 to-emerald-500",
  "ngoai-ngu": "from-sky-500 to-cyan-500",
  "ky-nang-mem": "from-violet-500 to-purple-500",
};
