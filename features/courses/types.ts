import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import type { Instructor } from "@/features/instructors/types";

export type CourseLevel = "beginner" | "intermediate" | "advanced";

export interface CourseInstructorSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  categoryLabel: string;
  level: CourseLevel;
  /** VNĐ, 0 = miễn phí. */
  price: number;
  originalPrice?: number;
  rating: number;
  reviewCount: number;
  studentCount: number;
  durationHours: number;
  lessonCount: number;
  instructor: CourseInstructorSummary;
  isNew: boolean;
  publishedAt: string;
}

export interface CourseCategory {
  slug: string;
  label: string;
  description: string;
  courseCount: number;
  icon?: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
}

export interface CourseLessonResource {
  id: string;
  name: string;
  /** Ví dụ "PDF · 2.4 MB" — hiển thị cạnh tên tài liệu. */
  fileLabel: string;
}

export interface CourseCurriculumLesson {
  id: string;
  title: string;
  durationMinutes: number;
  /** Xem thử miễn phí không cần ghi danh. */
  isPreview?: boolean;
  resources?: CourseLessonResource[];
}

export interface CourseCurriculumSection {
  id: string;
  title: string;
  lessons: CourseCurriculumLesson[];
}

export interface CourseReview {
  id: string;
  studentName: string;
  avatarUrl: string | null;
  rating: number;
  content: string;
  createdAt: string;
}

export interface CourseDetail extends Course {
  longDescription: string;
  /** "Bạn sẽ học được gì" */
  objectives: string[];
  /** "Yêu cầu đầu vào" */
  requirements: string[];
  curriculum: CourseCurriculumSection[];
  instructorDetail: Instructor;
}
