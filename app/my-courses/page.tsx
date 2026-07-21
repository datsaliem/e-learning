import type { Metadata } from "next";

import { requireUser } from "@/features/auth/queries";
import { getMyCourses } from "@/features/enrollments/queries";
import { MyCoursesView } from "@/features/enrollments/components/my-courses-view";

export const metadata: Metadata = {
  title: "Khoá học của tôi",
};

export default async function MyCoursesPage() {
  await requireUser();
  const enrollments = await getMyCourses();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Khoá học của tôi</h1>
        <p className="text-muted-foreground text-sm">
          Theo dõi tiến độ và tiếp tục các khoá học đã ghi danh.
        </p>
      </div>

      <MyCoursesView enrollments={enrollments} />
    </div>
  );
}
