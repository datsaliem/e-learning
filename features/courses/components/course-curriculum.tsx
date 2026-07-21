import { PlayCircleIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CourseCurriculumSection } from "@/features/courses/types";

export function CourseCurriculum({ curriculum }: { curriculum: CourseCurriculumSection[] }) {
  const totalLessons = curriculum.reduce((sum, section) => sum + section.lessons.length, 0);
  const totalMinutes = curriculum.reduce(
    (sum, section) =>
      sum + section.lessons.reduce((acc, lesson) => acc + lesson.durationMinutes, 0),
    0,
  );
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nội dung khoá học</CardTitle>
        <p className="text-muted-foreground text-sm">
          {curriculum.length} chương · {totalLessons} bài học · {totalHours} giờ
        </p>
      </CardHeader>
      <CardContent>
        <Accordion defaultValue={curriculum[0] ? [curriculum[0].id] : []}>
          {curriculum.map((section) => (
            <AccordionItem key={section.id} value={section.id}>
              <AccordionTrigger>
                <span className="flex flex-1 items-center justify-between pr-2">
                  <span>{section.title}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {section.lessons.length} bài
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="flex flex-col gap-2.5">
                  {section.lessons.map((lesson) => (
                    <li
                      key={lesson.id}
                      className="text-muted-foreground flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <PlayCircleIcon className="size-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{lesson.title}</span>
                        {lesson.isPreview && (
                          <Badge variant="secondary" className="shrink-0">
                            Xem thử
                          </Badge>
                        )}
                      </span>
                      <span className="shrink-0">{lesson.durationMinutes} phút</span>
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
