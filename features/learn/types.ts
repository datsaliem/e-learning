export type LessonContentType = "video" | "text" | "pdf" | "external_link";

export interface LessonProgressEntry {
  lessonId: string;
  completed: boolean;
  watchedSeconds: number;
}

export interface LearningResource {
  id: string;
  name: string;
  downloadUrl: string;
  fileLabel: string;
}

export interface LearningLesson {
  id: string;
  title: string;
  type: LessonContentType;
  content: string | null;
  videoUrl: string | null;
  documentUrl: string | null;
  externalUrl: string | null;
  durationSeconds: number;
  resources: LearningResource[];
}

export interface LearningLessonSummary {
  id: string;
  title: string;
  type: LessonContentType;
  durationSeconds: number;
}

export interface LearningSection {
  id: string;
  title: string;
  lessons: LearningLessonSummary[];
}

export interface AdjacentLearningLesson {
  id: string;
  title: string;
}

export interface LearningPageData {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  sections: LearningSection[];
  lesson: LearningLesson;
  progressMap: Record<string, LessonProgressEntry>;
  initialWatchedSeconds: number;
  initialCompleted: boolean;
  previousLesson: AdjacentLearningLesson | null;
  nextLesson: AdjacentLearningLesson | null;
}

export type LearningPageResult =
  | { access: "granted"; data: LearningPageData }
  | { access: "not_enrolled"; courseSlug: string }
  | { access: "expired"; courseSlug: string }
  | { access: "not_found" };

export type LessonProgressMutationResult =
  { data: { watchedSeconds: number; completed: boolean } } | { error: string };

export function getCompletionThresholdSeconds(
  type: LessonContentType,
  durationSeconds: number,
): number {
  return type === "video" ? Math.ceil(durationSeconds * 0.9) : durationSeconds;
}
