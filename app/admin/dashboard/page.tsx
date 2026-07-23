import type { Metadata } from "next";

import { AdminDashboard } from "@/features/admin-dashboard/components/admin-dashboard";
import { getAdminDashboard } from "@/features/admin-dashboard/queries";

export const metadata: Metadata = {
  title: "Bảng điều khiển quản trị",
  description: "Tổng quan người dùng, khóa học, đơn hàng và tăng trưởng toàn hệ thống.",
};

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const dashboard = await getAdminDashboard();

  return <AdminDashboard data={dashboard} />;
}
