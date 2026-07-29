"use client";

import {
  BookOpenIcon,
  CalendarClockIcon,
  CheckIcon,
  Clock3Icon,
  EyeIcon,
  MessageSquareWarningIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { COURSE_STATUS_CONFIG } from "@/features/course-moderation/constants";
import type { ModerationCourse, ModerationDecision } from "@/features/course-moderation/types";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CourseModerationCard({
  course,
  onPreview,
  onAction,
}: {
  course: ModerationCourse;
  onPreview: () => void;
  onAction: (decision: ModerationDecision) => void;
}) {
  const status = COURSE_STATUS_CONFIG[course.status];
  const relevantDate = course.submittedAt ?? course.updatedAt;

  return (
    <Card className="h-full">
      <div className="grid min-h-44 sm:grid-cols-[12rem_1fr]">
        <div className="bg-muted relative min-h-40 overflow-hidden sm:min-h-full">
          {course.thumbnailUrl ? (
            <div
              role="img"
              aria-label={`Thumbnail ${course.title}`}
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover/card:scale-[1.02]"
              style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex flex-col items-center justify-center gap-2">
              <BookOpenIcon className="size-8" aria-hidden="true" />
              <span className="text-xs">Chưa có thumbnail</span>
            </div>
          )}
        </div>

        <CardContent className="flex min-w-0 flex-col gap-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <CalendarClockIcon className="size-3.5" aria-hidden="true" />
              <time dateTime={relevantDate}>{dateFormatter.format(new Date(relevantDate))}</time>
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg leading-snug font-semibold">{course.title}</h2>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {course.shortDescription || "Chưa có mô tả ngắn."}
            </p>
          </div>

          <div className="text-muted-foreground mt-auto flex flex-wrap gap-x-4 gap-y-2 text-xs">
            <span className="flex min-w-0 items-center gap-1">
              <UserRoundIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{course.instructor.fullName}</span>
            </span>
            <span className="flex items-center gap-1">
              <BookOpenIcon className="size-3.5" aria-hidden="true" />
              {course.lessonCount} bài
            </span>
            <span className="flex items-center gap-1">
              <Clock3Icon className="size-3.5" aria-hidden="true" />
              {Math.ceil(course.totalDurationSeconds / 60)} phút
            </span>
          </div>
        </CardContent>
      </div>

      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={onPreview}>
          <EyeIcon aria-hidden="true" />
          Xem preview
        </Button>
        {course.status === "pending_review" && (
          <>
            <Button type="button" variant="destructive" onClick={() => onAction("reject")}>
              <XIcon aria-hidden="true" />
              Từ chối
            </Button>
            <Button type="button" variant="warning" onClick={() => onAction("request_changes")}>
              <MessageSquareWarningIcon aria-hidden="true" />
              Yêu cầu sửa
            </Button>
            <Button type="button" variant="success" onClick={() => onAction("approve")}>
              <CheckIcon aria-hidden="true" />
              Phê duyệt
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}
