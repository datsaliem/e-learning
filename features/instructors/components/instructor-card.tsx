import { BookOpenIcon, StarIcon, UsersIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { formatCompactNumber } from "@/lib/format";
import { getInitials } from "@/lib/utils";
import type { Instructor } from "@/features/instructors/types";

export function InstructorCard({ instructor }: { instructor: Instructor }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 text-center">
        <Avatar className="size-16">
          <AvatarFallback className="text-lg">{getInitials(instructor.name)}</AvatarFallback>
        </Avatar>
        <div>
          <h3 className="font-medium">{instructor.name}</h3>
          <p className="text-muted-foreground text-sm">{instructor.headline}</p>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" aria-hidden="true" />
            {formatCompactNumber(instructor.studentCount)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpenIcon className="size-3.5" aria-hidden="true" />
            {instructor.courseCount} khoá học
          </span>
          <span className="flex items-center gap-1">
            <StarIcon className="fill-warning text-warning size-3.5" aria-hidden="true" />
            {instructor.rating.toFixed(1)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
