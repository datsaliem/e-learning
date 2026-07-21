import type { Metadata } from "next";

import { DashboardShell } from "@/features/auth/components/dashboard-shell";
import { requireRole } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển học viên",
};

export default async function StudentDashboardPage() {
  const user = await requireRole("student");

  return <DashboardShell user={user} heading="Bảng điều khiển học viên" />;
}
