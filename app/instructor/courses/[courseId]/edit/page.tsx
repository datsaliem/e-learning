import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/features/auth/queries";
import { CourseBuilderForm } from "@/features/course-builder/components/course-builder-form";
import { getOwnedCourseDraft } from "@/features/course-builder/queries";

interface EditCoursePageProps {
  params: Promise<{ courseId: string }>;
}

export const metadata: Metadata = {
  title: "Chỉnh sửa khoá học",
};

export default async function EditCoursePage({ params }: EditCoursePageProps) {
  const [{ courseId }, user] = await Promise.all([params, requireRole("instructor")]);
  const course = await getOwnedCourseDraft(courseId, user.id);

  if (!course) {
    notFound();
  }

  return <CourseBuilderForm instructorName={user.fullName ?? user.email} initialCourse={course} />;
}
