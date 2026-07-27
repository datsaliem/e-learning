"use client";

import {
  BookOpenIcon,
  CalendarDaysIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  MailIcon,
  PhoneIcon,
  UserRoundCheckIcon,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { UserRoleBadge, UserStatusBadge } from "@/features/admin-users/components/user-badges";
import { formatAdminUserDate } from "@/features/admin-users/constants";
import type { AdminManagedUser } from "@/features/admin-users/types";
import { getInitials } from "@/lib/utils";

function DetailItem({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MailIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[1.75rem_1fr] gap-2">
      <span className="bg-muted text-muted-foreground flex size-7 items-center justify-center rounded-lg">
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <div className="mt-0.5 truncate text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

export function UserProfileDialog({
  user,
  currentUserId,
  onOpenChange,
}: {
  user: AdminManagedUser | null;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
}) {
  if (!user) return null;

  const name = user.fullName?.trim() || user.email.split("@")[0] || "Người dùng";
  const safeWebsite = user.website && /^https?:\/\//i.test(user.website) ? user.website : null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-3 pr-8">
            <Avatar size="lg" className="size-12">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-lg">{name}</DialogTitle>
                {user.id === currentUserId ? (
                  <span className="text-primary text-xs">Bạn</span>
                ) : null}
              </div>
              <DialogDescription className="mt-1 break-all">{user.email}</DialogDescription>
              <div className="mt-2 flex flex-wrap gap-2">
                <UserRoleBadge role={user.role} />
                <UserStatusBadge status={user.status} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <DetailItem icon={MailIcon} label="Email">
            {user.email}
          </DetailItem>
          <DetailItem icon={PhoneIcon} label="Số điện thoại">
            {user.phone || "Chưa cập nhật"}
          </DetailItem>
          <DetailItem icon={CalendarDaysIcon} label="Ngày tham gia">
            {formatAdminUserDate(user.createdAt)}
          </DetailItem>
          <DetailItem icon={UserRoundCheckIcon} label="Đăng nhập gần nhất">
            {formatAdminUserDate(user.lastSignInAt)}
          </DetailItem>
          <DetailItem icon={GraduationCapIcon} label="Lượt ghi danh">
            {user.enrollmentCount}
          </DetailItem>
          <DetailItem icon={BookOpenIcon} label="Khóa học phụ trách">
            {user.courseCount}
          </DetailItem>
        </div>

        <div className="grid gap-4 rounded-xl border p-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Headline
            </p>
            <p className="mt-1 text-sm">{user.headline || "Chưa cập nhật"}</p>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Giới thiệu
            </p>
            <p className="mt-1 text-sm leading-6 whitespace-pre-wrap">
              {user.bio || "Người dùng chưa cập nhật phần giới thiệu."}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Website
            </p>
            {safeWebsite ? (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noreferrer"
                className="text-primary mt-1 inline-flex max-w-full items-center gap-1 text-sm hover:underline"
              >
                <span className="truncate">{safeWebsite}</span>
                <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <p className="mt-1 text-sm">{user.website || "Chưa cập nhật"}</p>
            )}
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          Email xác nhận: {formatAdminUserDate(user.emailConfirmedAt)}
          {user.status === "blocked"
            ? ` · Khóa đến: ${formatAdminUserDate(user.bannedUntil)}`
            : null}
        </p>
      </DialogContent>
    </Dialog>
  );
}
