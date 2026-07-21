import Link from "next/link";
import { PlayCircleIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn, getInitials } from "@/lib/utils";
import { CATEGORY_GRADIENT } from "@/features/courses/constants";
import type { MyCourseEnrollment } from "@/features/enrollments/types";
import type { VariantProps } from "class-variance-authority";

const STATUS_BADGE: Record<
  MyCourseEnrollment["status"],
  { label: string; variant: VariantProps<typeof badgeVariants>["variant"] }
> = {
  in_progress: { label: "Đang học", variant: "secondary" },
  completed: { label: "Đã hoàn thành", variant: "success" },
  expired: { label: "Đã hết hạn", variant: "destructive" },
};

const CTA_LABEL: Record<MyCourseEnrollment["status"], string> = {
  in_progress: "Tiếp tục học",
  completed: "Xem lại khoá học",
  expired: "Gia hạn truy cập",
};

export function MyCourseCard({ enrollment }: { enrollment: MyCourseEnrollment }) {
  const badge = STATUS_BADGE[enrollment.status];

  return (
    <Card className="overflow-hidden py-0">
      <div className="flex flex-col sm:flex-row">
        <Link
          href={`/courses/${enrollment.courseSlug}`}
          className={cn(
            "relative flex aspect-video shrink-0 items-center justify-center bg-gradient-to-br sm:aspect-auto sm:w-40",
            CATEGORY_GRADIENT[enrollment.categorySlug] ?? "from-primary to-primary/60",
          )}
        >
          <PlayCircleIcon className="size-9 text-white/90" aria-hidden="true" />
        </Link>

        <CardContent className="flex flex-1 flex-col gap-3 py-4">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/courses/${enrollment.courseSlug}`}
              className="hover:text-primary line-clamp-2 font-medium transition-colors"
            >
              {enrollment.courseTitle}
            </Link>
            <Badge variant={badge.variant} className="shrink-0">
              {badge.label}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-sm">
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px]">
                {getInitials(enrollment.instructorName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate">{enrollment.instructorName}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tiến độ</span>
              <span className="font-medium">{enrollment.progressPercent}%</span>
            </div>
            <Progress value={enrollment.progressPercent} />
          </div>

          {enrollment.lastLessonTitle && (
            <p className="text-muted-foreground truncate text-xs">
              Gần nhất: {enrollment.lastLessonTitle}
            </p>
          )}

          <Button
            size="sm"
            className="mt-auto self-start"
            nativeButton={false}
            render={<Link href={`/courses/${enrollment.courseSlug}`} />}
          >
            {CTA_LABEL[enrollment.status]}
          </Button>
        </CardContent>
      </div>
    </Card>
  );
}
