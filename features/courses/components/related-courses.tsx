import { SectionHeading } from "@/components/shared/section-heading";
import { CourseCard } from "@/features/courses/components/course-card";
import type { Course } from "@/features/courses/types";

export function RelatedCourses({ courses }: { courses: Course[] }) {
  if (courses.length === 0) {
    return null;
  }

  return (
    <section className="border-border border-t">
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <SectionHeading title="Khoá học liên quan" description="Có thể bạn cũng quan tâm." />
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </div>
    </section>
  );
}
