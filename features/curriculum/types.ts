export type CurriculumLessonType = "video" | "text" | "pdf" | "external_link";

export interface CurriculumResource {
  id: string;
  lessonId: string;
  name: string;
  storagePath: string;
  fileSizeBytes: number | null;
  mimeType: string | null;
  sortOrder: number;
}

export interface CurriculumLesson {
  id: string;
  sectionId: string;
  title: string;
  type: CurriculumLessonType;
  content: string;
  videoPath: string | null;
  contentPath: string | null;
  externalUrl: string;
  durationSeconds: number;
  isPreview: boolean;
  sortOrder: number;
  resources: CurriculumResource[];
}

export interface CurriculumSection {
  id: string;
  courseId: string;
  title: string;
  sortOrder: number;
  lessons: CurriculumLesson[];
}

export type LessonMutationData = Omit<CurriculumLesson, "resources">;

export type CurriculumActionResult<T> = { data: T } | { error: string };

export interface LessonContentMutationInput {
  lessonType: Extract<CurriculumLessonType, "video" | "pdf">;
  storagePath: string;
}
