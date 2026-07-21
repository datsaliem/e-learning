import type { Metadata } from "next";

import { requireRole } from "@/features/auth/queries";
import { CourseBuilderForm } from "@/features/course-builder/components/course-builder-form";

export const metadata: Metadata = {
  title: "Tạo khoá học mới",
};

export default async function NewCoursePage() {
  const user = await requireRole("instructor");

  return <CourseBuilderForm instructorName={user.fullName ?? user.email} />;
}
