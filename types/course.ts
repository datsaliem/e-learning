export type CourseWorkflowStatus =
  "draft" | "pending_review" | "changes_requested" | "published" | "rejected" | "archived";

export type CourseStatusAction =
  | "created"
  | "submitted"
  | "resubmitted"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "archived"
  | "restored"
  | "status_changed";

export interface CourseStatusHistoryItem {
  id: string;
  fromStatus: CourseWorkflowStatus | null;
  toStatus: CourseWorkflowStatus;
  action: CourseStatusAction;
  reason: string | null;
  changedByRole: "instructor" | "admin" | "system";
  createdAt: string;
}

export const EDITABLE_COURSE_STATUSES: readonly CourseWorkflowStatus[] = [
  "draft",
  "changes_requested",
  "rejected",
];

export function isEditableCourseStatus(status: CourseWorkflowStatus): boolean {
  return EDITABLE_COURSE_STATUSES.includes(status);
}
