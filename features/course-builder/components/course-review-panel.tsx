import {
  CircleCheckBigIcon,
  Clock3Icon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusHistoryList } from "@/features/course-moderation/components/status-history-list";
import { COURSE_STATUS_CONFIG } from "@/features/course-moderation/constants";
import type { OwnedCourseDraft } from "@/features/course-builder/types";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function CourseReviewPanel({ course }: { course: OwnedCourseDraft }) {
  const status = COURSE_STATUS_CONFIG[course.status];

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheckIcon className="text-primary" aria-hidden="true" />
              Trạng thái kiểm duyệt
            </CardTitle>
            <CardDescription className="mt-1">{status.description}</CardDescription>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {course.latestReviewFeedback && (
          <Alert className="border-warning/30 bg-warning/5">
            <MessageSquareTextIcon className="text-warning" aria-hidden="true" />
            <AlertTitle>Phản hồi từ quản trị viên</AlertTitle>
            <AlertDescription>
              <p className="text-foreground whitespace-pre-wrap">{course.latestReviewFeedback}</p>
              {course.latestReviewedAt && (
                <p className="mt-2 flex items-center gap-1 text-xs">
                  <Clock3Icon className="size-3" aria-hidden="true" />
                  {dateFormatter.format(new Date(course.latestReviewedAt))}
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {course.status === "published" && course.publishedAt && (
          <div className="bg-success/5 border-success/20 flex items-center gap-3 rounded-lg border p-3">
            <CircleCheckBigIcon className="text-success" aria-hidden="true" />
            <div>
              <p className="font-medium">Khóa học đã được xuất bản</p>
              <p className="text-muted-foreground text-sm">
                {dateFormatter.format(new Date(course.publishedAt))}
              </p>
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-4 font-medium">Lịch sử trạng thái</h3>
          <StatusHistoryList history={course.reviewHistory} compact />
        </div>
      </CardContent>
    </Card>
  );
}
