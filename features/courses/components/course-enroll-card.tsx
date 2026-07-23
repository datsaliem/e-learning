"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClockIcon, InfinityIcon, Loader2Icon, PlayCircleIcon, SignalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrencyVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { safeAction } from "@/lib/safe-action";
import { enrollInCourse } from "@/features/enrollments/actions";
import { AddToCartButton } from "@/features/cart/components/add-to-cart-button";
import { CATEGORY_GRADIENT, LEVEL_LABEL } from "@/features/courses/constants";
import type { CourseDetail } from "@/features/courses/types";

export function CourseEnrollCard({
  course,
  isAuthenticated,
  isEnrolled,
}: {
  course: CourseDetail;
  isAuthenticated: boolean;
  isEnrolled: boolean;
}) {
  const [enrolled, setEnrolled] = React.useState(isEnrolled);
  const [isPending, startTransition] = React.useTransition();

  const totalLessons = course.curriculum.reduce((sum, section) => sum + section.lessons.length, 0);

  function handleEnroll() {
    startTransition(async () => {
      const result = await safeAction(() => enrollInCourse(course.id, course.slug));
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      setEnrolled(true);
      toast.success(
        course.price === 0 ? "Ghi danh thành công!" : "Mua khoá học thành công, chúc bạn học vui!",
      );
    });
  }

  return (
    <Card className="overflow-hidden py-0">
      <div
        className={cn(
          "relative flex aspect-video items-center justify-center bg-gradient-to-br",
          CATEGORY_GRADIENT[course.categorySlug] ?? "from-primary to-primary/60",
        )}
      >
        <PlayCircleIcon className="size-14 text-white/90" aria-hidden="true" />
        <span className="sr-only">Xem giới thiệu khoá học</span>
      </div>

      <CardContent className="flex flex-col gap-4 pt-4 pb-6">
        <div className="flex items-baseline gap-2">
          {course.price === 0 ? (
            <span className="text-success text-2xl font-semibold">Miễn phí</span>
          ) : (
            <>
              <span className="text-2xl font-semibold">{formatCurrencyVND(course.price)}</span>
              {course.originalPrice && (
                <span className="text-muted-foreground text-sm line-through">
                  {formatCurrencyVND(course.originalPrice)}
                </span>
              )}
            </>
          )}
        </div>

        {enrolled ? (
          <Button size="lg" nativeButton={false} render={<Link href="/dashboard" />}>
            Tiếp tục học
          </Button>
        ) : course.price > 0 ? (
          <AddToCartButton course={course} />
        ) : isAuthenticated ? (
          <Button size="lg" disabled={isPending} onClick={handleEnroll}>
            {isPending && <Loader2Icon className="animate-spin" />}
            Ghi danh miễn phí
          </Button>
        ) : (
          <Button size="lg" nativeButton={false} render={<Link href="/login" />}>
            Đăng nhập để ghi danh
          </Button>
        )}

        <Separator />

        <ul className="text-muted-foreground flex flex-col gap-2.5 text-sm">
          <li className="flex items-center gap-2">
            <ClockIcon className="size-4 shrink-0" aria-hidden="true" />
            {course.durationHours} giờ học
          </li>
          <li className="flex items-center gap-2">
            <PlayCircleIcon className="size-4 shrink-0" aria-hidden="true" />
            {totalLessons} bài học
          </li>
          <li className="flex items-center gap-2">
            <SignalIcon className="size-4 shrink-0" aria-hidden="true" />
            Trình độ {LEVEL_LABEL[course.level]}
          </li>
          <li className="flex items-center gap-2">
            <InfinityIcon className="size-4 shrink-0" aria-hidden="true" />
            Học không giới hạn thời gian
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
