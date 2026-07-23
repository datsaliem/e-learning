export type EnrollmentStatus = "in_progress" | "completed" | "expired";

export interface MyCourseEnrollment {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  categorySlug: string;
  categoryLabel: string;
  instructorName: string;
  instructorAvatarUrl: string | null;
  progressPercent: number;
  lastLessonTitle: string | null;
  lastActivityAt: string | null;
  enrolledAt: string;
  expiresAt: string | null;
  status: EnrollmentStatus;
  certificateCode: string | null;
}
