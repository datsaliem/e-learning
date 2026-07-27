export const NOTIFICATION_TYPES = [
  "payment_success",
  "enrollment",
  "course_completed",
  "certificate_issued",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationSnapshot {
  notifications: NotificationItem[];
  unreadCount: number;
}

export type NotificationReadResult = { data: { notificationId: string } } | { error: string };

export type NotificationsReadAllResult = { data: { updatedCount: number } } | { error: string };
