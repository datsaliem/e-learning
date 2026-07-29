"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InboxIcon, ScrollTextIcon, ShieldCheckIcon, UsersIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  AccountStatusDialog,
  type AccountStatusDialogState,
} from "@/features/admin-users/components/account-status-dialog";
import { ChangeRoleDialog } from "@/features/admin-users/components/change-role-dialog";
import { UserFilters } from "@/features/admin-users/components/user-filters";
import { UserList } from "@/features/admin-users/components/user-list";
import { UserPagination } from "@/features/admin-users/components/user-pagination";
import { UserProfileDialog } from "@/features/admin-users/components/user-profile-dialog";
import type {
  AdminManagedUser,
  AdminUserFilters,
  AdminUserMutationResult,
  AdminUserPageData,
} from "@/features/admin-users/types";

export function AdminUsersPage({
  initialData,
  filters,
  currentUserId,
}: {
  initialData: AdminUserPageData;
  filters: AdminUserFilters;
  currentUserId: string;
}) {
  const router = useRouter();
  const [users, setUsers] = React.useState(initialData.users);
  const [profileUser, setProfileUser] = React.useState<AdminManagedUser | null>(null);
  const [roleUser, setRoleUser] = React.useState<AdminManagedUser | null>(null);
  const [statusState, setStatusState] = React.useState<AccountStatusDialogState | null>(null);

  React.useEffect(() => {
    setUsers(initialData.users);
  }, [initialData.users]);

  function handleCompleted(mutation: Extract<AdminUserMutationResult, { data: unknown }>["data"]) {
    setUsers((current) =>
      current.map((user) =>
        user.id === mutation.userId
          ? {
              ...user,
              ...(mutation.role ? { role: mutation.role } : {}),
              ...(mutation.status ? { status: mutation.status } : {}),
            }
          : user,
      ),
    );
    router.refresh();
  }

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 text-sm font-medium">
            <ShieldCheckIcon className="size-4" aria-hidden="true" />
            Quản trị truy cập
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý người dùng</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Tìm kiếm hồ sơ, phân quyền và kiểm soát trạng thái đăng nhập trên toàn hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            <UsersIcon aria-hidden="true" />
            {initialData.pagination.total} người dùng
          </Badge>
          <Badge variant="outline">
            <ScrollTextIcon aria-hidden="true" />
            Audit log đang bật
          </Badge>
        </div>
      </header>

      <Card size="sm">
        <CardContent>
          <UserFilters filters={filters} />
        </CardContent>
      </Card>

      {users.length > 0 ? (
        <>
          <UserList
            users={users}
            currentUserId={currentUserId}
            onView={setProfileUser}
            onChangeRole={setRoleUser}
            onChangeStatus={(user, blocked) => setStatusState({ user, blocked })}
          />
          <UserPagination filters={filters} pagination={initialData.pagination} />
        </>
      ) : (
        <div className="border-border bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
          <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
            <InboxIcon aria-hidden="true" />
          </span>
          <h2 className="mt-4 font-semibold">Không tìm thấy người dùng</h2>
          <p className="text-muted-foreground mt-1 max-w-md text-sm">
            Thử thay đổi từ khóa, vai trò hoặc trạng thái tài khoản.
          </p>
        </div>
      )}

      <UserProfileDialog
        user={profileUser}
        currentUserId={currentUserId}
        onOpenChange={(open) => !open && setProfileUser(null)}
      />
      <ChangeRoleDialog
        user={roleUser}
        onOpenChange={(open) => !open && setRoleUser(null)}
        onCompleted={handleCompleted}
      />
      <AccountStatusDialog
        state={statusState}
        onOpenChange={(open) => !open && setStatusState(null)}
        onCompleted={handleCompleted}
      />
    </main>
  );
}
