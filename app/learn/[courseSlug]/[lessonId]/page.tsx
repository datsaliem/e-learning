import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { requireRole } from "@/features/auth/queries";
import { LearnPlayer } from "@/features/learn/components/learn-player";
import { LearnSidebar } from "@/features/learn/components/learn-sidebar";
import { getLearningPageData } from "@/features/learn/queries";

interface LearningPageProps {
  params: Promise<{ courseSlug: string; lessonId: string }>;
}

export const metadata: Metadata = {
  title: "Không gian học tập",
  robots: { index: false, follow: false },
};

export default async function LearningPage({ params }: LearningPageProps) {
  const [{ courseSlug, lessonId }, user] = await Promise.all([params, requireRole("student")]);
  const result = await getLearningPageData(courseSlug, lessonId, user.id);

  if (result.access === "not_found") {
    notFound();
  }

  if (result.access === "not_enrolled") {
    redirect(`/courses/${result.courseSlug}?learning=enrollment-required`);
  }

  if (result.access === "expired") {
    redirect("/my-courses?tab=expired&learning=expired");
  }

  const { data } = result;

  return (
    <div className="bg-muted/20 flex-1">
      <div className="mx-auto grid w-full max-w-7xl items-start gap-6 px-4 py-6 lg:grid-cols-[20rem_minmax(0,1fr)] lg:py-8">
        <aside className="bg-card ring-foreground/10 rounded-xl p-4 ring-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <LearnSidebar
            courseTitle={data.courseTitle}
            courseSlug={data.courseSlug}
            sections={data.sections}
            progressMap={data.progressMap}
            currentLessonId={data.lesson.id}
          />
        </aside>

        <main className="bg-background ring-foreground/10 min-w-0 rounded-xl p-4 ring-1 sm:p-6 lg:p-8">
          <LearnPlayer
            courseId={data.courseId}
            courseSlug={data.courseSlug}
            lesson={data.lesson}
            initialWatchedSeconds={data.initialWatchedSeconds}
            initialCompleted={data.initialCompleted}
            previousLesson={data.previousLesson}
            nextLesson={data.nextLesson}
          />
        </main>
      </div>
    </div>
  );
}
