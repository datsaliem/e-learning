import Link from "next/link";
import { ClockIcon, StarIcon, UsersIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatCompactNumber, formatCurrencyVND } from "@/lib/format";
import { cn, getInitials } from "@/lib/utils";
import { CATEGORY_GRADIENT, LEVEL_LABEL } from "@/features/courses/constants";
import type { Course } from "@/features/courses/types";

export function CourseCard({ course }: { course: Course }) {
  return (
    <Card className="group/course overflow-hidden py-0">
      <Link href={`/courses/${course.slug}`} className="flex flex-col">
        <div
          className={cn(
            "relative flex aspect-video items-center justify-center bg-gradient-to-br",
            CATEGORY_GRADIENT[course.categorySlug] ?? "from-primary to-primary/60",
          )}
        >
          <span className="text-2xl font-semibold text-white/90">{course.categoryLabel}</span>
          {course.isNew && (
            <Badge variant="success" className="absolute top-2 left-2">
              Mới
            </Badge>
          )}
          <Badge
            variant="outline"
            className="bg-background/80 absolute top-2 right-2 backdrop-blur"
          >
            {LEVEL_LABEL[course.level]}
          </Badge>
        </div>

        <CardContent className="flex flex-1 flex-col gap-2 px-4 pt-4">
          <h3 className="group-hover/course:text-primary line-clamp-2 leading-snug font-medium transition-colors">
            {course.title}
          </h3>

          <div className="flex items-center gap-1.5 text-sm">
            <Avatar className="size-5">
              <AvatarFallback className="text-[10px]">
                {getInitials(course.instructor.name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-muted-foreground truncate">{course.instructor.name}</span>
          </div>

          <div className="text-muted-foreground flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <StarIcon className="fill-warning text-warning size-3.5" aria-hidden="true" />
              <span className="text-foreground font-medium">{course.rating.toFixed(1)}</span>
              <span>({formatCompactNumber(course.reviewCount)})</span>
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="size-3.5" aria-hidden="true" />
              {formatCompactNumber(course.studentCount)}
            </span>
            <span className="flex items-center gap-1">
              <ClockIcon className="size-3.5" aria-hidden="true" />
              {course.durationHours}h
            </span>
          </div>
        </CardContent>

        <CardFooter className="bg-transparent px-4 pt-2 pb-4">
          {course.price === 0 ? (
            <span className="text-success font-semibold">Miễn phí</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="font-semibold">{formatCurrencyVND(course.price)}</span>
              {course.originalPrice && (
                <span className="text-muted-foreground text-xs line-through">
                  {formatCurrencyVND(course.originalPrice)}
                </span>
              )}
            </div>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
}
