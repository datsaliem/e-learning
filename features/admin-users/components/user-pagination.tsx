import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { AdminUserFilters, AdminUserPagination } from "@/features/admin-users/types";
import { cn } from "@/lib/utils";

function pageHref(filters: AdminUserFilters, page: number): string {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.status !== "all") params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export function UserPagination({
  filters,
  pagination,
}: {
  filters: AdminUserFilters;
  pagination: AdminUserPagination;
}) {
  if (pagination.totalPages <= 1) return null;

  const start = (pagination.page - 1) * pagination.perPage + 1;
  const end = Math.min(pagination.page * pagination.perPage, pagination.total);

  return (
    <nav
      aria-label="Phân trang người dùng"
      className="flex flex-col items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-muted-foreground text-sm">
        Hiển thị {start}–{end} trong {pagination.total} người dùng
      </p>
      <div className="flex items-center gap-2">
        {pagination.page > 1 ? (
          <Link
            href={pageHref(filters, pagination.page - 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <ChevronLeftIcon aria-hidden="true" />
            Trang trước
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-50",
            )}
            aria-disabled="true"
          >
            <ChevronLeftIcon aria-hidden="true" />
            Trang trước
          </span>
        )}
        <span className="text-sm font-medium">
          {pagination.page}/{pagination.totalPages}
        </span>
        {pagination.page < pagination.totalPages ? (
          <Link
            href={pageHref(filters, pagination.page + 1)}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Trang sau
            <ChevronRightIcon aria-hidden="true" />
          </Link>
        ) : (
          <span
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "pointer-events-none opacity-50",
            )}
            aria-disabled="true"
          >
            Trang sau
            <ChevronRightIcon aria-hidden="true" />
          </span>
        )}
      </div>
    </nav>
  );
}
