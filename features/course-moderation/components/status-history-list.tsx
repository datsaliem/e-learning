import { CircleCheckIcon, CircleDotIcon, ShieldCheckIcon, UserRoundIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { COURSE_STATUS_CONFIG, STATUS_ACTION_LABELS } from "@/features/course-moderation/constants";
import type { CourseStatusHistoryItem } from "@/types/course";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function StatusHistoryList({
  history,
  compact = false,
}: {
  history: CourseStatusHistoryItem[];
  compact?: boolean;
}) {
  if (history.length === 0) {
    return <p className="text-muted-foreground text-sm">Chưa có lịch sử trạng thái.</p>;
  }

  const items = compact ? history.slice(0, 5) : history;

  return (
    <ol className="relative grid gap-0">
      {items.map((item, index) => {
        const isAdmin = item.changedByRole === "admin";
        const ActorIcon = isAdmin ? ShieldCheckIcon : UserRoundIcon;
        const StatusIcon = index === 0 ? CircleCheckIcon : CircleDotIcon;

        return (
          <li key={item.id} className="relative grid grid-cols-[1.5rem_1fr] gap-3 pb-5 last:pb-0">
            {index < items.length - 1 && (
              <span
                className="bg-border absolute top-6 bottom-0 left-[0.7rem] w-px"
                aria-hidden="true"
              />
            )}
            <span className="bg-background text-primary relative z-10 flex size-6 items-center justify-center rounded-full">
              <StatusIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{STATUS_ACTION_LABELS[item.action]}</p>
                <Badge variant={COURSE_STATUS_CONFIG[item.toStatus].variant}>
                  {COURSE_STATUS_CONFIG[item.toStatus].label}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 text-xs">
                <span className="inline-flex items-center gap-1">
                  <ActorIcon className="size-3" aria-hidden="true" />
                  {item.changedByRole === "admin"
                    ? "Quản trị viên"
                    : item.changedByRole === "instructor"
                      ? "Giảng viên"
                      : "Hệ thống"}
                </span>
                <span aria-hidden="true">•</span>
                <time dateTime={item.createdAt}>
                  {dateFormatter.format(new Date(item.createdAt))}
                </time>
              </p>
              {item.reason && (
                <blockquote className="border-warning/40 bg-warning/5 mt-2 rounded-r-lg border-l-2 px-3 py-2 text-sm whitespace-pre-wrap">
                  {item.reason}
                </blockquote>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
