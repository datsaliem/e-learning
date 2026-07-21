import Link from "next/link";
import { StarIcon, UsersIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatCompactNumber } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import { CourseEnrollCard } from "@/features/courses/components/course-enroll-card";
import { LEVEL_LABEL } from "@/features/courses/constants";
import type { CourseDetail } from "@/features/courses/types";

export function CourseHero({
  course,
  isAuthenticated,
  isEnrolled,
}: {
  course: CourseDetail;
  isAuthenticated: boolean;
  isEnrolled: boolean;
}) {
  return (
    <section className="border-border bg-muted/30 border-b">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-4">
          <Link
            href={`/courses?category=${course.categorySlug}`}
            className="text-primary text-sm font-medium hover:underline"
          >
            {course.categoryLabel}
          </Link>

          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {course.title}
          </h1>

          <p className="text-muted-foreground text-lg text-balance">{course.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <StarIcon className="fill-warning text-warning size-4" aria-hidden="true" />
              <span className="text-foreground font-medium">{course.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({formatCompactNumber(course.reviewCount)} đánh giá)
              </span>
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <UsersIcon className="size-4" aria-hidden="true" />
              {formatCompactNumber(course.studentCount)} học viên
            </span>
            <Badge variant="outline">{LEVEL_LABEL[course.level]}</Badge>
          </div>

          <a href="#instructor" className="flex items-center gap-2 pt-2">
            <Avatar className="size-9">
              <AvatarFallback>{getInitials(course.instructorDetail.name)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">
              <span className="text-muted-foreground">Giảng viên </span>
              <span className="font-medium hover:underline">{course.instructorDetail.name}</span>
            </span>
          </a>
        </div>

        <CourseEnrollCard
          course={course}
          isAuthenticated={isAuthenticated}
          isEnrolled={isEnrolled}
        />
      </div>
    </section>
  );
}
