import type { CourseStatusHistoryItem, CourseWorkflowStatus } from "@/types/course";

export type ModerationDecision = "approve" | "request_changes" | "reject";

export interface ModerationInstructor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
}

export interface ModerationCourse {
  id: string;
  instructor: ModerationInstructor;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  category: string;
  level: string;
  language: string;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  price: number;
  salePrice: number | null;
  status: CourseWorkflowStatus;
  submittedAt: string | null;
  publishedAt: string | null;
  latestReviewFeedback: string | null;
  latestReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sectionCount: number;
  lessonCount: number;
  totalDurationSeconds: number;
  history: CourseStatusHistoryItem[];
}

export type ModerationActionResult =
  | {
      data: {
        courseId: string;
        status: Extract<CourseWorkflowStatus, "published" | "changes_requested" | "rejected">;
        feedback: string | null;
        reviewedAt: string;
        publishedAt: string | null;
      };
    }
  | { error: string };
