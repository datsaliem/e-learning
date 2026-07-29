import type { Metadata } from "next";

import { CourseModerationPage } from "@/features/course-moderation/components/course-moderation-page";
import { getCoursesForModeration } from "@/features/course-moderation/queries";

export const metadata: Metadata = {
  title: "Kiểm duyệt khóa học",
  description: "Duyệt, yêu cầu chỉnh sửa và theo dõi lịch sử xuất bản khóa học.",
};

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage() {
  const courses = await getCoursesForModeration();

  return <CourseModerationPage initialCourses={courses} />;
}
