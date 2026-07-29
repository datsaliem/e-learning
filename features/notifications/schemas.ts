import { z } from "zod";

import { NOTIFICATION_TYPES, type NotificationItem } from "@/features/notifications/types";

export const notificationTypeSchema = z.enum(NOTIFICATION_TYPES);

export const notificationRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(160),
  content: z.string().min(1).max(1000),
  link: z
    .string()
    .max(500)
    .refine((value) => value.startsWith("/") && !value.startsWith("//"))
    .nullable(),
  is_read: z.boolean(),
  created_at: z.string(),
});

export const notificationIdSchema = z.string().uuid("Thông báo không hợp lệ.");

export function notificationFromRow(row: z.infer<typeof notificationRowSchema>): NotificationItem {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    link: row.link,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
