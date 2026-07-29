import "server-only";

import { redirect, unstable_rethrow } from "next/navigation";

import type { UserRole } from "@/features/auth/types";
import { isSupabaseConfigured } from "@/lib/env";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  role: UserRole;
}

/** Trả về user đang đăng nhập kèm role, hoặc null nếu chưa đăng nhập. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseConfigured) {
    return null;
  }

  try {
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email ?? "",
      fullName: profile?.full_name ?? null,
      role: (profile?.role as UserRole | undefined) ?? "student",
    };
  } catch (error) {
    // Không nuốt lỗi nội bộ mà Next.js dùng để chuyển route sang dynamic rendering.
    // Nếu bị catch, các trang theo session sẽ bị prerender thành redirect /login vĩnh viễn.
    unstable_rethrow(error);
    return null;
  }
}

/** Đường dẫn dashboard tương ứng với từng role — dùng để redirect sau khi đăng nhập. */
export function dashboardPathForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin/dashboard";
    case "instructor":
      return "/instructor/dashboard";
    case "student":
    default:
      return "/dashboard";
  }
}

/**
 * Auth guard cho các trang server component: bắt buộc đăng nhập và đúng
 * role. Chưa đăng nhập => về /login. Sai role => về đúng dashboard của họ
 * (thay vì chỉ chặn trắng trang, tránh gây cảm giác lỗi).
 */
export async function requireRole(role: UserRole): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== role) {
    redirect(dashboardPathForRole(user.role));
  }

  return user;
}

/** Auth guard cho các trang dùng chung mọi role (hồ sơ, cài đặt...) — chỉ cần đã đăng nhập. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
