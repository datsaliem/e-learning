import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminUsersPage } from "@/features/admin-users/components/admin-users-page";
import { getAdminUsers, parseAdminUserFilters } from "@/features/admin-users/queries";
import type { AdminUserFilters } from "@/features/admin-users/types";
import { requireRole } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Quản lý người dùng",
  description: "Tìm kiếm, phân quyền và kiểm soát trạng thái tài khoản người dùng.",
};

export const dynamic = "force-dynamic";

type AdminUsersSearchParams = Promise<Record<string, string | string[] | undefined>>;

function usersHref(filters: AdminUserFilters, page: number): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.status !== "all") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersRoute({
  searchParams,
}: {
  searchParams: AdminUsersSearchParams;
}) {
  const admin = await requireRole("admin");
  const filters = parseAdminUserFilters(await searchParams);
  const data = await getAdminUsers(filters);
  const lastPage = Math.max(data.pagination.totalPages, 1);

  if (filters.page > lastPage) {
    redirect(usersHref(filters, lastPage));
  }

  return <AdminUsersPage initialData={data} filters={filters} currentUserId={admin.id} />;
}
