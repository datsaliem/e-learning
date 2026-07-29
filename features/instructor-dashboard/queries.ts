import "server-only";

import { instructorDashboardSchema } from "@/features/instructor-dashboard/schemas";
import type { InstructorDashboardData } from "@/features/instructor-dashboard/types";
import { createClient } from "@/lib/supabase/server";

/**
 * The RPC has no instructor-id argument. Its SECURITY DEFINER body derives the
 * scope from auth.uid(), verifies the instructor role, and only returns
 * aggregates for courses currently owned by that instructor.
 */
export async function getInstructorDashboard(): Promise<InstructorDashboardData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_instructor_dashboard");

  if (error) {
    throw new Error("Không thể tải số liệu giảng viên. Vui lòng thử lại sau.");
  }

  const parsed = instructorDashboardSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Dữ liệu bảng điều khiển không đúng định dạng.");
  }

  return parsed.data;
}
