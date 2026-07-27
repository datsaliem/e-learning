import type { UserRole } from "@/features/auth/types";

export type AdminUserStatus = "active" | "blocked" | "unverified";

export interface AdminManagedUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  role: UserRole;
  status: AdminUserStatus;
  emailConfirmedAt: string | null;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  createdAt: string;
  enrollmentCount: number;
  courseCount: number;
}

export interface AdminUserFilters {
  q: string;
  role: UserRole | "all";
  status: AdminUserStatus | "all";
  page: number;
}

export interface AdminUserPagination {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface AdminUserPageData {
  users: AdminManagedUser[];
  pagination: AdminUserPagination;
}

export type AdminUserMutationResult =
  | {
      data: {
        userId: string;
        role?: UserRole;
        status?: AdminUserStatus;
      };
    }
  | { error: string };
