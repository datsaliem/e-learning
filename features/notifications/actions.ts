"use server";

import { notificationIdSchema } from "@/features/notifications/schemas";
import type {
  NotificationReadResult,
  NotificationsReadAllResult,
} from "@/features/notifications/types";
import { createClient } from "@/lib/supabase/server";

async function getNotificationContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." } as const;
  }

  return { ok: true, supabase, userId: user.id } as const;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationReadResult> {
  const parsedId = notificationIdSchema.safeParse(notificationId);
  if (!parsedId.success) {
    return { error: parsedId.error.issues[0]?.message ?? "Thông báo không hợp lệ." };
  }

  const context = await getNotificationContext();
  if (!context.ok) return { error: context.error };

  const { error } = await context.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", parsedId.data)
    .eq("user_id", context.userId)
    .eq("is_read", false);

  if (error) {
    return { error: "Không thể đánh dấu thông báo đã đọc." };
  }

  return { data: { notificationId: parsedId.data } };
}

export async function markAllNotificationsRead(): Promise<NotificationsReadAllResult> {
  const context = await getNotificationContext();
  if (!context.ok) return { error: context.error };

  const { data, error } = await context.supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", context.userId)
    .eq("is_read", false)
    .select("id");

  if (error) {
    return { error: "Không thể đánh dấu tất cả thông báo đã đọc." };
  }

  return { data: { updatedCount: data?.length ?? 0 } };
}
