"use client";

import * as React from "react";
import Link from "next/link";
import {
  AwardIcon,
  BellIcon,
  BellOffIcon,
  BookCheckIcon,
  CheckCheckIcon,
  CircleDollarSignIcon,
  GraduationCapIcon,
  Loader2Icon,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markAllNotificationsRead, markNotificationRead } from "@/features/notifications/actions";
import { notificationFromRow, notificationRowSchema } from "@/features/notifications/schemas";
import type {
  NotificationItem,
  NotificationSnapshot,
  NotificationType,
} from "@/features/notifications/types";
import { createClient } from "@/lib/supabase/client";
import { safeAction } from "@/lib/safe-action";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_NOTIFICATIONS = 8;

const NOTIFICATION_ICONS: Record<NotificationType, LucideIcon> = {
  payment_success: CircleDollarSignIcon,
  enrollment: GraduationCapIcon,
  course_completed: BookCheckIcon,
  certificate_issued: AwardIcon,
};

function formatRelativeTime(value: string): string {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Vừa xong";

  const elapsedSeconds = Math.round((timestamp - Date.now()) / 1000);
  const relativeTime = new Intl.RelativeTimeFormat("vi", { numeric: "auto" });

  if (Math.abs(elapsedSeconds) < 60) return relativeTime.format(elapsedSeconds, "second");

  const elapsedMinutes = Math.round(elapsedSeconds / 60);
  if (Math.abs(elapsedMinutes) < 60) return relativeTime.format(elapsedMinutes, "minute");

  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (Math.abs(elapsedHours) < 24) return relativeTime.format(elapsedHours, "hour");

  const elapsedDays = Math.round(elapsedHours / 24);
  if (Math.abs(elapsedDays) < 30) return relativeTime.format(elapsedDays, "day");

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(timestamp);
}

function NotificationContent({ notification }: { notification: NotificationItem }) {
  const Icon = NOTIFICATION_ICONS[notification.type];

  return (
    <>
      <span
        className={cn(
          "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
          notification.isRead ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary",
        )}
      >
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="line-clamp-1 flex-1 text-sm font-medium">{notification.title}</span>
          {!notification.isRead ? (
            <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full">
              <span className="sr-only">Chưa đọc</span>
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-relaxed">
          {notification.content}
        </span>
        <time
          dateTime={notification.createdAt}
          suppressHydrationWarning
          className="text-muted-foreground mt-1 block text-[11px]"
        >
          {formatRelativeTime(notification.createdAt)}
        </time>
      </span>
    </>
  );
}

export function NotificationDropdown({
  userId,
  initialSnapshot,
}: {
  userId: string;
  initialSnapshot: NotificationSnapshot;
}) {
  const [notifications, setNotifications] = React.useState(initialSnapshot.notifications);
  const [unreadCount, setUnreadCount] = React.useState(initialSnapshot.unreadCount);
  const [isMarkingAll, setIsMarkingAll] = React.useState(false);
  const notificationsRef = React.useRef(initialSnapshot.notifications);

  function replaceNotifications(update: (current: NotificationItem[]) => NotificationItem[]) {
    setNotifications((current) => {
      const next = update(current);
      notificationsRef.current = next;
      return next;
    });
  }

  React.useEffect(() => {
    notificationsRef.current = initialSnapshot.notifications;
    setNotifications(initialSnapshot.notifications);
    setUnreadCount(initialSnapshot.unreadCount);
  }, [initialSnapshot]);

  React.useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const parsed = notificationRowSchema.safeParse(payload.new);
          if (!parsed.success || parsed.data.user_id !== userId) return;

          const notification = notificationFromRow(parsed.data);
          const alreadyVisible = notificationsRef.current.some(
            (current) => current.id === notification.id,
          );

          replaceNotifications((current) =>
            [notification, ...current.filter((item) => item.id !== notification.id)].slice(
              0,
              MAX_VISIBLE_NOTIFICATIONS,
            ),
          );

          if (!alreadyVisible && !notification.isRead) {
            setUnreadCount((current) => current + 1);
            toast.info(notification.title, { description: notification.content });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const parsed = notificationRowSchema.safeParse(payload.new);
          if (!parsed.success || parsed.data.user_id !== userId) return;

          const notification = notificationFromRow(parsed.data);
          const previous = notificationsRef.current.find(
            (current) => current.id === notification.id,
          );

          if (previous && previous.isRead !== notification.isRead) {
            setUnreadCount((current) => Math.max(0, current + (notification.isRead ? -1 : 1)));
          } else if (!previous && notification.isRead) {
            // Rows outside the eight visible items still affect the global badge
            // when another tab marks them as read.
            setUnreadCount((current) => Math.max(0, current - 1));
          }

          replaceNotifications((current) =>
            current.map((item) => (item.id === notification.id ? notification : item)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function handleMarkRead(notification: NotificationItem) {
    if (notification.isRead) return;

    replaceNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    const result = await safeAction(() => markNotificationRead(notification.id));
    if ("error" in result) {
      replaceNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: false } : item)),
      );
      setUnreadCount((current) => current + 1);
      toast.error(result.error);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0 || isMarkingAll) return;

    const previousNotifications = notificationsRef.current;
    const previousUnreadCount = unreadCount;
    setIsMarkingAll(true);
    replaceNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);

    const result = await safeAction(() => markAllNotificationsRead());
    setIsMarkingAll(false);

    if ("error" in result) {
      replaceNotifications(() => previousNotifications);
      setUnreadCount(previousUnreadCount);
      toast.error(result.error);
      return;
    }

    toast.success("Đã đánh dấu tất cả thông báo là đã đọc.");
  }

  const countLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const triggerLabel = unreadCount > 0 ? `Mở thông báo, ${unreadCount} chưa đọc` : "Mở thông báo";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            className="relative"
            aria-label={triggerLabel}
          />
        }
      >
        <BellIcon aria-hidden="true" />
        {unreadCount > 0 ? (
          <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums">
            {countLabel}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(24rem,calc(100vw-2rem))] p-0"
      >
        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-3 py-2.5">
          <span className="font-semibold">Thông báo</span>
          <span className="text-muted-foreground text-xs font-normal">
            {unreadCount > 0 ? `${unreadCount} chưa đọc` : "Đã đọc tất cả"}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="m-0" />

        {notifications.length > 0 ? (
          <DropdownMenuGroup className="max-h-[min(70vh,28rem)] overflow-y-auto p-1">
            {notifications.map((notification) =>
              notification.link ? (
                <DropdownMenuItem
                  key={notification.id}
                  render={<Link href={notification.link} />}
                  className={cn(
                    "h-auto items-start gap-3 rounded-lg p-3",
                    !notification.isRead && "bg-primary/[0.045]",
                  )}
                  onClick={() => void handleMarkRead(notification)}
                >
                  <NotificationContent notification={notification} />
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    "h-auto items-start gap-3 rounded-lg p-3",
                    !notification.isRead && "bg-primary/[0.045]",
                  )}
                  onClick={() => void handleMarkRead(notification)}
                >
                  <NotificationContent notification={notification} />
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuGroup>
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
            <span className="bg-muted text-muted-foreground flex size-11 items-center justify-center rounded-xl">
              <BellOffIcon className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-3 text-sm font-medium">Chưa có thông báo</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Các cập nhật về khóa học và thanh toán sẽ xuất hiện tại đây.
            </p>
          </div>
        )}

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="justify-center rounded-none py-2.5"
          disabled={unreadCount === 0 || isMarkingAll}
          onClick={() => void handleMarkAllRead()}
        >
          {isMarkingAll ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <CheckCheckIcon aria-hidden="true" />
          )}
          Đánh dấu tất cả đã đọc
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
