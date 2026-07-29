import type { CourseStatusAction, CourseWorkflowStatus } from "@/types/course";

export const COURSE_STATUS_CONFIG: Record<
  CourseWorkflowStatus,
  {
    label: string;
    description: string;
    variant: "outline" | "warning" | "success" | "destructive" | "secondary";
  }
> = {
  draft: {
    label: "Bản nháp",
    description: "Giảng viên đang hoàn thiện nội dung.",
    variant: "outline",
  },
  pending_review: {
    label: "Chờ duyệt",
    description: "Đã gửi và đang chờ quản trị viên kiểm duyệt.",
    variant: "warning",
  },
  changes_requested: {
    label: "Cần chỉnh sửa",
    description: "Quản trị viên đã gửi yêu cầu chỉnh sửa.",
    variant: "warning",
  },
  published: {
    label: "Đã xuất bản",
    description: "Khóa học đang hiển thị với học viên.",
    variant: "success",
  },
  rejected: {
    label: "Bị từ chối",
    description: "Khóa học chưa đáp ứng tiêu chí xuất bản.",
    variant: "destructive",
  },
  archived: {
    label: "Đã lưu trữ",
    description: "Khóa học đã được gỡ khỏi catalog.",
    variant: "secondary",
  },
};

export const MODERATION_TABS = [
  { value: "pending_review", label: "Chờ duyệt" },
  { value: "draft", label: "Bản nháp" },
  { value: "changes_requested", label: "Cần chỉnh sửa" },
  { value: "published", label: "Đã xuất bản" },
  { value: "rejected", label: "Bị từ chối" },
] as const satisfies ReadonlyArray<{ value: CourseWorkflowStatus; label: string }>;

export const STATUS_ACTION_LABELS: Record<CourseStatusAction, string> = {
  created: "Tạo khóa học",
  submitted: "Gửi duyệt",
  resubmitted: "Gửi duyệt lại",
  approved: "Phê duyệt",
  changes_requested: "Yêu cầu chỉnh sửa",
  rejected: "Từ chối",
  archived: "Lưu trữ",
  restored: "Xuất bản lại",
  status_changed: "Đổi trạng thái",
};
