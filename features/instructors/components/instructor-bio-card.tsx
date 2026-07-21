import { BookOpenIcon, StarIcon, UsersIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompactNumber } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { Instructor } from "@/features/instructors/types";

export function InstructorBioCard({ instructor }: { instructor: Instructor }) {
  return (
    <Card id="instructor">
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Avatar className="size-16 shrink-0">
          <AvatarFallback className="text-lg">{getInitials(instructor.name)}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-2">
          <div>
            <h3 className="text-lg font-medium">{instructor.name}</h3>
            <p className="text-muted-foreground text-sm">{instructor.headline}</p>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-4 text-sm">
            <span className="flex items-center gap-1">
              <StarIcon className="fill-warning text-warning size-4" aria-hidden="true" />
              {instructor.rating.toFixed(1)} đánh giá giảng viên
            </span>
            <span className="flex items-center gap-1">
              <UsersIcon className="size-4" aria-hidden="true" />
              {formatCompactNumber(instructor.studentCount)} học viên
            </span>
            <span className="flex items-center gap-1">
              <BookOpenIcon className="size-4" aria-hidden="true" />
              {instructor.courseCount} khoá học
            </span>
          </div>
          <p className="text-muted-foreground text-sm">{instructor.bio}</p>
        </div>
      </CardContent>
    </Card>
  );
}
