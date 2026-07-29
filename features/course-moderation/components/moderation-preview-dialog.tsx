"use client";

import {
  BookOpenIcon,
  Clock3Icon,
  Layers3Icon,
  MessageSquareTextIcon,
  ShieldCheckIcon,
  UserRoundIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COURSE_STATUS_CONFIG } from "@/features/course-moderation/constants";
import { StatusHistoryList } from "@/features/course-moderation/components/status-history-list";
import { COURSE_CATEGORY_OPTIONS, COURSE_LEVEL_OPTIONS } from "@/features/course-builder/constants";
import type { ModerationCourse, ModerationDecision } from "@/features/course-moderation/types";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function ModerationPreviewDialog({
  course,
  onOpenChange,
  onAction,
}: {
  course: ModerationCourse | null;
  onOpenChange: (open: boolean) => void;
  onAction: (decision: ModerationDecision) => void;
}) {
  if (!course) return null;

  const status = COURSE_STATUS_CONFIG[course.status];
  const effectivePrice = course.salePrice ?? course.price;
  const category =
    COURSE_CATEGORY_OPTIONS.find((option) => option.value === course.category)?.label ||
    course.category ||
    "Chưa chọn danh mục";
  const level =
    COURSE_LEVEL_OPTIONS.find((option) => option.value === course.level)?.label || course.level;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-4xl">
        <div className="bg-muted relative aspect-video overflow-hidden rounded-t-xl">
          {course.trailerUrl ? (
            <video
              src={course.trailerUrl}
              controls
              preload="metadata"
              aria-label={`Trailer ${course.title}`}
              className="size-full bg-black object-contain"
            />
          ) : course.thumbnailUrl ? (
            <div
              role="img"
              aria-label={`Thumbnail ${course.title}`}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${course.thumbnailUrl})` }}
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
              Chưa có thumbnail hoặc trailer
            </div>
          )}
        </div>

        <div className="grid gap-7 p-5 sm:p-7">
          <DialogHeader className="gap-3 text-left">
            <div className="flex flex-wrap gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>
              <Badge variant="secondary">{category}</Badge>
              <Badge variant="outline">{level}</Badge>
              <Badge variant="outline">{course.language}</Badge>
            </div>
            <DialogTitle className="text-2xl leading-tight sm:text-3xl">{course.title}</DialogTitle>
            <DialogDescription className="text-base">
              {course.shortDescription || "Khóa học chưa có mô tả ngắn."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 rounded-xl border p-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
                <UserRoundIcon aria-hidden="true" />
              </span>
              <div>
                <p className="text-muted-foreground text-xs uppercase">Giảng viên</p>
                <p className="font-medium">{course.instructor.fullName}</p>
                {course.instructor.headline && (
                  <p className="text-muted-foreground text-sm">{course.instructor.headline}</p>
                )}
              </div>
            </div>
            <div className="sm:text-right">
              <p className="text-muted-foreground text-xs uppercase">Giá bán</p>
              {course.salePrice !== null && (
                <p className="text-muted-foreground text-sm line-through">
                  {currencyFormatter.format(course.price)}
                </p>
              )}
              <p className="text-primary text-xl font-semibold">
                {effectivePrice === 0 ? "Miễn phí" : currencyFormatter.format(effectivePrice)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3">
              <Layers3Icon className="text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">{course.sectionCount}</p>
                <p className="text-muted-foreground text-xs">section</p>
              </div>
            </div>
            <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3">
              <BookOpenIcon className="text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">{course.lessonCount}</p>
                <p className="text-muted-foreground text-xs">bài học</p>
              </div>
            </div>
            <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3">
              <Clock3Icon className="text-primary" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {Math.max(0, Math.ceil(course.totalDurationSeconds / 60))}
                </p>
                <p className="text-muted-foreground text-xs">phút học</p>
              </div>
            </div>
          </div>

          <section aria-labelledby="moderation-description-heading">
            <h2 id="moderation-description-heading" className="mb-2 text-lg font-semibold">
              Giới thiệu khóa học
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {course.fullDescription || "Khóa học chưa có mô tả đầy đủ."}
            </p>
          </section>

          {course.latestReviewFeedback && (
            <section
              className="border-warning/30 bg-warning/5 rounded-xl border p-4"
              aria-labelledby="latest-feedback-heading"
            >
              <h2
                id="latest-feedback-heading"
                className="mb-2 flex items-center gap-2 font-semibold"
              >
                <MessageSquareTextIcon className="text-warning" aria-hidden="true" />
                Phản hồi gần nhất
              </h2>
              <p className="whitespace-pre-wrap">{course.latestReviewFeedback}</p>
            </section>
          )}

          <section aria-labelledby="moderation-history-heading">
            <h2
              id="moderation-history-heading"
              className="mb-4 flex items-center gap-2 text-lg font-semibold"
            >
              <ShieldCheckIcon className="text-primary" aria-hidden="true" />
              Lịch sử kiểm duyệt
            </h2>
            <StatusHistoryList history={course.history} />
          </section>
        </div>

        {course.status === "pending_review" && (
          <DialogFooter className="sticky bottom-0 mx-0 mb-0 rounded-none px-5 sm:px-7">
            <Button type="button" variant="destructive" onClick={() => onAction("reject")}>
              Từ chối
            </Button>
            <Button type="button" variant="warning" onClick={() => onAction("request_changes")}>
              Yêu cầu chỉnh sửa
            </Button>
            <Button type="button" variant="success" onClick={() => onAction("approve")}>
              Phê duyệt
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
