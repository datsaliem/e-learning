import type { Metadata } from "next";

import { DashboardShell } from "@/features/auth/components/dashboard-shell";
import { requireRole } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển quản trị",
};

export default async function AdminDashboardPage() {
  const user = await requireRole("admin");

  return <DashboardShell user={user} heading="Bảng điều khiển quản trị" />;
}
