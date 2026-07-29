import { Badge } from "@/components/ui/badge";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/features/admin-users/constants";
import type { AdminUserStatus } from "@/features/admin-users/types";
import type { UserRole } from "@/features/auth/types";

export function UserRoleBadge({ role }: { role: UserRole }) {
  const variant = role === "admin" ? "default" : role === "instructor" ? "secondary" : "outline";

  return <Badge variant={variant}>{USER_ROLE_LABELS[role]}</Badge>;
}

export function UserStatusBadge({ status }: { status: AdminUserStatus }) {
  const variant =
    status === "active" ? "success" : status === "blocked" ? "destructive" : "warning";

  return <Badge variant={variant}>{USER_STATUS_LABELS[status]}</Badge>;
}
