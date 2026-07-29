import type { Metadata } from "next";

import { requireRole } from "@/features/auth/queries";
import { InstructorDashboard } from "@/features/instructor-dashboard/components/instructor-dashboard";
import { getInstructorDashboard } from "@/features/instructor-dashboard/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển giảng viên",
  description: "Tổng quan khóa học, học viên, doanh thu và hiệu quả giảng dạy.",
};

// Authentication and dashboard aggregates are request-scoped.
export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const user = await requireRole("instructor");
  const dashboard = await getInstructorDashboard();

  return (
    <InstructorDashboard
      data={dashboard}
      instructorName={user.fullName ?? user.email.split("@")[0] ?? "Giảng viên"}
    />
  );
}
