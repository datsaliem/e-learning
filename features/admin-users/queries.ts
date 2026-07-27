import "server-only";

import { ADMIN_USER_PAGE_SIZE } from "@/features/admin-users/constants";
import { adminUserFiltersSchema, adminUserPageSchema } from "@/features/admin-users/schemas";
import type { AdminUserFilters, AdminUserPageData } from "@/features/admin-users/types";
import { createClient } from "@/lib/supabase/server";

type SearchParamValue = string | string[] | undefined;

export function parseAdminUserFilters(
  searchParams: Record<string, SearchParamValue>,
): AdminUserFilters {
  const value = (key: string) => {
    const candidate = searchParams[key];
    return Array.isArray(candidate) ? candidate[0] : candidate;
  };

  const parsed = adminUserFiltersSchema.safeParse({
    q: value("q") ?? "",
    role: value("role") ?? "all",
    status: value("status") ?? "all",
    page: value("page") ?? 1,
  });

  return parsed.success
    ? parsed.data
    : {
        q: "",
        role: "all",
        status: "all",
        page: 1,
      };
}

export async function getAdminUsers(filters: AdminUserFilters): Promise<AdminUserPageData> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_users", {
    p_search: filters.q || null,
    p_role: filters.role === "all" ? null : filters.role,
    p_status: filters.status === "all" ? null : filters.status,
    p_page: filters.page,
    p_per_page: ADMIN_USER_PAGE_SIZE,
  });

  if (error) {
    throw new Error("Không thể tải danh sách người dùng. Vui lòng thử lại sau.");
  }

  const parsed = adminUserPageSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Dữ liệu quản lý người dùng không đúng định dạng.");
  }

  return parsed.data;
}
