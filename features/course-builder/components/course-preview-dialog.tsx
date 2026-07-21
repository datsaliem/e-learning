"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { COURSE_CATEGORY_OPTIONS, COURSE_LEVEL_OPTIONS } from "@/features/course-builder/constants";
import type { CourseBuilderInput } from "@/features/course-builder/schemas";

interface CoursePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: CourseBuilderInput;
  thumbnailUrl: string;
  trailerUrl: string;
  instructorName: string;
}

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function CoursePreviewDialog({
  open,
  onOpenChange,
  course,
  thumbnailUrl,
  trailerUrl,
  instructorName,
}: CoursePreviewDialogProps) {
  const category = COURSE_CATEGORY_OPTIONS.find(
    (option) => option.value === course.category,
  )?.label;
  const level = COURSE_LEVEL_OPTIONS.find((option) => option.value === course.level)?.label;
  const effectivePrice = course.salePrice ?? course.price;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-4xl">
        <div className="bg-muted relative aspect-video overflow-hidden">
          {trailerUrl ? (
            <video
              src={trailerUrl}
              controls
              preload="metadata"
              aria-label="Trailer khoá học"
              className="size-full bg-black object-contain"
            />
          ) : thumbnailUrl ? (
            <div
              role="img"
              aria-label={course.title || "Thumbnail khoá học"}
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${JSON.stringify(thumbnailUrl)})` }}
            />
          ) : (
            <div className="text-muted-foreground absolute inset-0 flex items-center justify-center">
              Chưa có thumbnail hoặc trailer
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 p-5 sm:p-7">
          <DialogHeader className="gap-3 text-left">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{category ?? "Chưa chọn danh mục"}</Badge>
              <Badge variant="outline">{level ?? "Chưa chọn cấp độ"}</Badge>
              <Badge variant="outline">{course.language || "Chưa chọn ngôn ngữ"}</Badge>
            </div>
            <DialogTitle className="text-2xl leading-tight sm:text-3xl">
              {course.title || "Tiêu đề khoá học"}
            </DialogTitle>
            <DialogDescription className="text-base">
              {course.shortDescription || "Mô tả ngắn sẽ xuất hiện tại đây."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap items-end justify-between gap-4 border-y py-4">
            <div>
              <p className="text-muted-foreground text-xs tracking-wide uppercase">Giảng viên</p>
              <p className="font-medium">{instructorName}</p>
            </div>
            <div className="text-right">
              {course.salePrice !== undefined && (
                <p className="text-muted-foreground text-sm line-through">
                  {currencyFormatter.format(course.price)}
                </p>
              )}
              <p className="text-primary text-2xl font-semibold">
                {effectivePrice === 0 ? "Miễn phí" : currencyFormatter.format(effectivePrice)}
              </p>
            </div>
          </div>

          <section aria-labelledby="preview-description-heading">
            <h2 id="preview-description-heading" className="mb-2 text-lg font-semibold">
              Giới thiệu khoá học
            </h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {course.fullDescription || "Mô tả đầy đủ sẽ xuất hiện tại đây."}
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
