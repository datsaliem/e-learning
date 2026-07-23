import type { CourseBuilderInput } from "@/features/course-builder/schemas";
import type { CourseStatusHistoryItem, CourseWorkflowStatus } from "@/types/course";

export type { CourseWorkflowStatus } from "@/types/course";

export interface OwnedCourseDraft extends CourseBuilderInput {
  id: string;
  status: CourseWorkflowStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  latestReviewFeedback: string | null;
  latestReviewedAt: string | null;
  reviewHistory: CourseStatusHistoryItem[];
}

export type CourseMutationResult =
  { data: { courseId: string; status: CourseWorkflowStatus } } | { error: string };

export interface CourseMediaMutationInput {
  thumbnailUrl?: string;
  trailerUrl?: string;
}
