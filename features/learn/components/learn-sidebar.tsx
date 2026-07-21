import Link from "next/link";
import { CheckCircle2Icon, CircleIcon, FileTextIcon, PlayCircleIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { LearningSection, LessonProgressEntry } from "@/features/learn/types";

function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return `${minutes} phút`;
}

export function LearnSidebar({
  courseTitle,
  courseSlug,
  sections,
  progressMap,
  currentLessonId,
}: {
  courseTitle: string;
  courseSlug: string;
  sections: LearningSection[];
  progressMap: Record<string, LessonProgressEntry>;
  currentLessonId: string;
}) {
  const allLessons = sections.flatMap((section) => section.lessons);
  const completedCount = allLessons.filter((lesson) => progressMap[lesson.id]?.completed).length;
  const progressPercent =
    allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;
  const activeSectionId = sections.find((section) =>
    section.lessons.some((lesson) => lesson.id === currentLessonId),
  )?.id;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/courses/${courseSlug}`}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          ← Quay lại trang khoá học
        </Link>
        <h2 className="mt-2 leading-snug font-semibold">{courseTitle}</h2>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Tiến độ khoá học</span>
          <span className="font-medium">
            {completedCount}/{allLessons.length} bài · {progressPercent}%
          </span>
        </div>
        <Progress value={progressPercent} aria-label={`Tiến độ khoá học ${progressPercent}%`} />
      </div>

      <Accordion defaultValue={activeSectionId ? [activeSectionId] : []}>
        {sections.map((section, sectionIndex) => (
          <AccordionItem key={section.id} value={section.id}>
            <AccordionTrigger>
              <span className="min-w-0 text-left">
                <span className="text-muted-foreground block text-xs font-normal">
                  Chương {sectionIndex + 1}
                </span>
                <span className="line-clamp-2">{section.title}</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ul className="flex flex-col gap-1">
                {section.lessons.map((lesson) => {
                  const isActive = lesson.id === currentLessonId;
                  const isCompleted = Boolean(progressMap[lesson.id]?.completed);

                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/learn/${courseSlug}/${lesson.id}`}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "focus-visible:ring-ring flex items-start gap-2 rounded-lg px-2 py-2 text-sm transition-colors outline-none focus-visible:ring-3",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground",
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2Icon
                            className="text-success mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        ) : isActive ? (
                          <PlayCircleIcon
                            className="text-primary mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        ) : lesson.type === "article" ? (
                          <FileTextIcon
                            className="text-muted-foreground/60 mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        ) : (
                          <CircleIcon
                            className="text-muted-foreground/50 mt-0.5 size-4 shrink-0"
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2">{lesson.title}</span>
                          <span className="mt-0.5 block text-xs font-normal opacity-75">
                            {lesson.type === "video" ? "Video" : "Bài đọc"} ·{" "}
                            {formatDuration(lesson.durationSeconds)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
