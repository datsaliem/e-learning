import type { CourseBuilderInput } from "@/features/course-builder/schemas";

export type CourseWorkflowStatus = "draft" | "pending_review" | "published" | "archived";

export interface OwnedCourseDraft extends CourseBuilderInput {
  id: string;
  status: CourseWorkflowStatus;
  submittedAt: string | null;
}

export type CourseMutationResult =
  { data: { courseId: string; status: CourseWorkflowStatus } } | { error: string };

export interface CourseMediaMutationInput {
  thumbnailUrl?: string;
  trailerUrl?: string;
}
