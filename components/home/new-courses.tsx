import { CourseCard } from "@/features/courses/components/course-card";
import { SectionHeading } from "@/components/shared/section-heading";
import type { Course } from "@/features/courses/types";

export function NewCourses({ courses }: { courses: Course[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <SectionHeading
        title="Khoá học mới"
        description="Nội dung mới cập nhật gần đây."
        viewAllHref="/courses?sort=newest"
      />

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}
