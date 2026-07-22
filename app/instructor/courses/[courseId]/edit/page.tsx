import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/features/auth/queries";
import { CourseBuilderForm } from "@/features/course-builder/components/course-builder-form";
import { getOwnedCourseDraft } from "@/features/course-builder/queries";
import { CurriculumBuilder } from "@/features/curriculum/components/curriculum-builder";
import { getOwnedCourseCurriculum } from "@/features/curriculum/queries";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export const metadata: Metadata = {
  title: "Chỉnh sửa khoá học",
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const [{ courseId }, user] = await Promise.all([params, requireRole("instructor")]);
  const [course, curriculum] = await Promise.all([
    getOwnedCourseDraft(courseId, user.id),
    getOwnedCourseCurriculum(courseId, user.id),
  ]);

  if (!course) {
    notFound();
  }

  return (
    <>
      <CourseBuilderForm instructorName={user.fullName ?? user.email} initialCourse={course} />
      <CurriculumBuilder courseId={courseId} initialSections={curriculum} />
    </>
  );
}
