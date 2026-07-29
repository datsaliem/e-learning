import "server-only";

import { z } from "zod";

import { notificationFromRow, notificationRowSchema } from "@/features/notifications/schemas";
import type { NotificationSnapshot } from "@/features/notifications/types";
import { createClient } from "@/lib/supabase/server";

const HEADER_NOTIFICATION_LIMIT = 8;
const NOTIFICATION_COLUMNS = "id, user_id, type, title, content, link, is_read, created_at";

export async function getNotificationSnapshot(userId: string): Promise<NotificationSnapshot> {
  const supabase = await createClient();
  const [notificationsResult, unreadResult] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(HEADER_NOTIFICATION_LIMIT),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false),
  ]);

  if (notificationsResult.error || unreadResult.error) {
    throw new Error("Không thể tải thông báo.");
  }

  const parsed = z.array(notificationRowSchema).safeParse(notificationsResult.data ?? []);
  if (!parsed.success) {
    throw new Error("Dữ liệu thông báo không đúng định dạng.");
  }

  return {
    notifications: parsed.data.map(notificationFromRow),
    unreadCount: unreadResult.count ?? 0,
  };
}
