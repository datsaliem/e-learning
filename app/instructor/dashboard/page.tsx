import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/features/auth/components/dashboard-shell";
import { requireRole } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển giảng viên",
};

export default async function InstructorDashboardPage() {
  const user = await requireRole("instructor");

  return (
    <DashboardShell
      user={user}
      heading="Bảng điều khiển giảng viên"
      actions={
        <Button nativeButton={false} render={<Link href="/instructor/courses/new" />}>
          Tạo khoá học
        </Button>
      }
    />
  );
}
