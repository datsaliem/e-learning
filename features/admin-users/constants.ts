import type { UserRole } from "@/features/auth/types";
import type { AdminUserStatus } from "@/features/admin-users/types";

export const ADMIN_USER_PAGE_SIZE = 10;

export const USER_ROLE_LABELS = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
} as const satisfies Record<UserRole, string>;

export const USER_STATUS_LABELS = {
  active: "Hoạt động",
  blocked: "Đã khóa",
  unverified: "Chưa xác nhận",
} as const satisfies Record<AdminUserStatus, string>;

export const USER_ROLE_OPTIONS = [
  { value: "all", label: "Tất cả vai trò" },
  { value: "student", label: USER_ROLE_LABELS.student },
  { value: "instructor", label: USER_ROLE_LABELS.instructor },
  { value: "admin", label: USER_ROLE_LABELS.admin },
] as const;

export const USER_STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: USER_STATUS_LABELS.active },
  { value: "blocked", label: USER_STATUS_LABELS.blocked },
  { value: "unverified", label: USER_STATUS_LABELS.unverified },
] as const;

export function formatAdminUserDate(value: string | null): string {
  if (!value) return "Chưa có";

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
