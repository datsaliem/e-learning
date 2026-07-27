"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterXIcon, Loader2Icon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { USER_ROLE_OPTIONS, USER_STATUS_OPTIONS } from "@/features/admin-users/constants";
import type { AdminUserFilters } from "@/features/admin-users/types";

export function UserFilters({ filters }: { filters: AdminUserFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(filters.q);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  function navigate(changes: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.delete("page");

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/admin/users?${query}` : "/admin/users");
    });
  }

  const hasFilters = Boolean(filters.q || filters.role !== "all" || filters.status !== "all");

  return (
    <form
      className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto]"
      aria-busy={isPending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q: search.trim() });
      }}
    >
      <div className="relative">
        <label htmlFor="admin-user-search" className="sr-only">
          Tìm người dùng
        </label>
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          id="admin-user-search"
          type="search"
          value={search}
          maxLength={100}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Tìm theo tên, email hoặc số điện thoại..."
          className="h-9 pl-8"
        />
      </div>

      <Select
        value={filters.role}
        onValueChange={(value) => navigate({ role: String(value ?? "all") })}
      >
        <SelectTrigger className="h-9 w-full" aria-label="Lọc theo vai trò">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(value) => navigate({ status: String(value ?? "all") })}
      >
        <SelectTrigger className="h-9 w-full" aria-label="Lọc theo trạng thái">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button type="submit" className="h-9 flex-1 lg:flex-none" disabled={isPending}>
          {isPending ? (
            <Loader2Icon className="animate-spin" aria-hidden="true" />
          ) : (
            <SearchIcon aria-hidden="true" />
          )}
          Tìm kiếm
        </Button>
        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Xóa bộ lọc"
            disabled={isPending}
            onClick={() => {
              setSearch("");
              startTransition(() => router.push("/admin/users"));
            }}
          >
            <FilterXIcon aria-hidden="true" />
          </Button>
        ) : null}
      </div>
    </form>
  );
}
