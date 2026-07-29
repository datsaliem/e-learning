"use client";

import {
  CalendarDaysIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  LockKeyholeIcon,
  LockKeyholeOpenIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserRoleBadge, UserStatusBadge } from "@/features/admin-users/components/user-badges";
import { formatAdminUserDate } from "@/features/admin-users/constants";
import type { AdminManagedUser } from "@/features/admin-users/types";
import { getInitials } from "@/lib/utils";

interface UserListProps {
  users: AdminManagedUser[];
  currentUserId: string;
  onView: (user: AdminManagedUser) => void;
  onChangeRole: (user: AdminManagedUser) => void;
  onChangeStatus: (user: AdminManagedUser, blocked: boolean) => void;
}

function UserIdentity({ user, currentUserId }: { user: AdminManagedUser; currentUserId: string }) {
  const name = user.fullName?.trim() || user.email.split("@")[0] || "Người dùng";

  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar size="lg">
        {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{name}</p>
          {user.id === currentUserId ? (
            <Badge variant="secondary" className="shrink-0">
              Bạn
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground truncate text-xs">{user.headline || user.email}</p>
      </div>
    </div>
  );
}

function UserActions({
  user,
  currentUserId,
  onView,
  onChangeRole,
  onChangeStatus,
}: UserListProps & { user: AdminManagedUser }) {
  const isCurrentUser = user.id === currentUserId;
  const willBlock = user.status !== "blocked";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" />}
        aria-label={`Thao tác với ${user.fullName || user.email}`}
      >
        <EllipsisVerticalIcon aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem onClick={() => onView(user)}>
          <EyeIcon aria-hidden="true" />
          Xem hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onChangeRole(user)}>
          <ShieldCheckIcon aria-hidden="true" />
          Thay đổi vai trò
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant={willBlock ? "destructive" : "default"}
          disabled={isCurrentUser && willBlock}
          onClick={() => onChangeStatus(user, willBlock)}
        >
          {willBlock ? (
            <LockKeyholeIcon aria-hidden="true" />
          ) : (
            <LockKeyholeOpenIcon aria-hidden="true" />
          )}
          {isCurrentUser && willBlock
            ? "Không thể tự khóa"
            : willBlock
              ? "Khóa tài khoản"
              : "Mở khóa tài khoản"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserList(props: UserListProps) {
  return (
    <>
      <div className="border-border hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[880px] border-collapse text-left text-sm">
          <thead className="bg-muted/55 text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Người dùng
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Vai trò
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Trạng thái
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Đăng nhập gần nhất
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {props.users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/25 transition-colors">
                <td className="px-4 py-3">
                  <UserIdentity user={user} currentUserId={props.currentUserId} />
                </td>
                <td className="px-4 py-3">
                  <UserRoleBadge role={user.role} />
                </td>
                <td className="px-4 py-3">
                  <UserStatusBadge status={user.status} />
                </td>
                <td className="text-muted-foreground px-4 py-3">
                  {formatAdminUserDate(user.lastSignInAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <UserActions {...props} user={user} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {props.users.map((user) => (
          <article key={user.id} className="rounded-xl border p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <UserIdentity user={user} currentUserId={props.currentUserId} />
              </div>
              <UserActions {...props} user={user} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <UserRoleBadge role={user.role} />
              <UserStatusBadge status={user.status} />
            </div>
            <div className="text-muted-foreground mt-4 grid gap-2 text-xs">
              <p className="flex min-w-0 items-center gap-2">
                <MailIcon className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </p>
              <p className="flex items-center gap-2">
                <CalendarDaysIcon className="size-3.5 shrink-0" aria-hidden="true" />
                Đăng nhập gần nhất: {formatAdminUserDate(user.lastSignInAt)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
