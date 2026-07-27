import type { Metadata } from "next";

import { requireRole } from "@/features/auth/queries";
import { CourseBuilderForm } from "@/features/course-builder/components/course-builder-form";
import { getCourseCategoryOptions } from "@/features/categories/queries";

export const metadata: Metadata = {
  title: "Tạo khoá học mới",
};

export default async function NewCoursePage() {
  const user = await requireRole("instructor");
  const categoryOptions = await getCourseCategoryOptions();

  return (
    <CourseBuilderForm
      instructorName={user.fullName ?? user.email}
      categoryOptions={categoryOptions}
    />
  );
}
