import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/features/auth/queries";
import { CourseBuilderForm } from "@/features/course-builder/components/course-builder-form";
import { getOwnedCourseDraft } from "@/features/course-builder/queries";
import { getCourseCategoryOptions } from "@/features/categories/queries";
import { CurriculumBuilder } from "@/features/curriculum/components/curriculum-builder";
import { getOwnedCourseCurriculum } from "@/features/curriculum/queries";
import { isEditableCourseStatus } from "@/types/course";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export const metadata: Metadata = {
  title: "Chỉnh sửa khoá học",
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const [{ courseId }, user] = await Promise.all([params, requireRole("instructor")]);
  const [course, curriculum, activeCategoryOptions] = await Promise.all([
    getOwnedCourseDraft(courseId, user.id),
    getOwnedCourseCurriculum(courseId, user.id),
    getCourseCategoryOptions(),
  ]);

  if (!course) {
    notFound();
  }

  const categoryOptions = activeCategoryOptions.some((option) => option.value === course.category)
    ? activeCategoryOptions
    : [
        {
          id: `inactive-${course.category}`,
          value: course.category,
          label: `${course.category} (đã tắt)`,
          name: course.category,
          icon: "folder",
          depth: 0,
        },
        ...activeCategoryOptions,
      ];

  return (
    <>
      <CourseBuilderForm
        instructorName={user.fullName ?? user.email}
        categoryOptions={categoryOptions}
        initialCourse={course}
      />
      <CurriculumBuilder
        courseId={courseId}
        initialSections={curriculum}
        readOnly={!isEditableCourseStatus(course.status)}
      />
    </>
  );
}
