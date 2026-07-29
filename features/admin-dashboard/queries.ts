import "server-only";

import { adminDashboardSchema } from "@/features/admin-dashboard/schemas";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";
import { createClient } from "@/lib/supabase/server";

/**
 * The aggregate-only RPC accepts no admin or tenant identifier. Authorization
 * is derived from auth.uid() inside Postgres before any platform data is read.
 */
export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_dashboard");

  if (error) {
    throw new Error("Không thể tải số liệu quản trị. Vui lòng thử lại sau.");
  }

  const parsed = adminDashboardSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Dữ liệu bảng điều khiển quản trị không đúng định dạng.");
  }

  return parsed.data;
}
