"use server";

import { revalidatePath } from "next/cache";

import {
  adminUserMutationResultSchema,
  changeUserRoleSchema,
  setUserBlockedSchema,
  type ChangeUserRoleInput,
  type SetUserBlockedInput,
} from "@/features/admin-users/schemas";
import type { AdminUserMutationResult } from "@/features/admin-users/types";
import { createClient } from "@/lib/supabase/server";

interface AdminActor {
  id: string;
}

async function getAdminActor(): Promise<AdminActor | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.role === "admin" ? { id: user.id } : null;
}

async function readFunctionError(error: unknown): Promise<string | null> {
  if (!error || typeof error !== "object" || !("context" in error)) {
    return null;
  }

  const context = (error as { context?: unknown }).context;
  if (!(context instanceof Response)) return null;

  try {
    const payload = (await context.clone().json()) as { error?: unknown };
    return typeof payload.error === "string" ? payload.error : null;
  } catch {
    return null;
  }
}

async function invokeAdminUserManagement(
  body:
    | {
        action: "change_role";
        userId: string;
        role: ChangeUserRoleInput["role"];
        reason: string;
      }
    | {
        action: "set_blocked";
        userId: string;
        blocked: boolean;
        reason: string;
      },
): Promise<AdminUserMutationResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke("admin-user-management", {
    body,
  });

  if (error) {
    return {
      error:
        (await readFunctionError(error)) ?? "Không thể kết nối tới dịch vụ quản trị người dùng.",
    };
  }

  const parsed = adminUserMutationResultSchema.safeParse(data);
  if (!parsed.success) {
    return { error: "Dịch vụ quản trị trả về dữ liệu không hợp lệ." };
  }

  return parsed.data;
}

function refreshAdminUserViews() {
  revalidatePath("/admin/users");
  revalidatePath("/admin/dashboard");
}

export async function changeUserRole(input: ChangeUserRoleInput): Promise<AdminUserMutationResult> {
  const parsed = changeUserRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const actor = await getAdminActor();
  if (!actor) {
    return { error: "Phiên quản trị không hợp lệ hoặc đã hết hạn." };
  }

  const result = await invokeAdminUserManagement({
    action: "change_role",
    userId: parsed.data.userId,
    role: parsed.data.role,
    reason: parsed.data.reason,
  });

  if ("error" in result) return result;

  refreshAdminUserViews();
  return result;
}

export async function setUserBlocked(input: SetUserBlockedInput): Promise<AdminUserMutationResult> {
  const parsed = setUserBlockedSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }

  const actor = await getAdminActor();
  if (!actor) {
    return { error: "Phiên quản trị không hợp lệ hoặc đã hết hạn." };
  }

  if (parsed.data.userId === actor.id) {
    return { error: "Bạn không thể tự khóa tài khoản quản trị đang đăng nhập." };
  }

  const result = await invokeAdminUserManagement({
    action: "set_blocked",
    userId: parsed.data.userId,
    blocked: parsed.data.blocked,
    reason: parsed.data.reason,
  });

  if ("error" in result) return result;

  refreshAdminUserViews();
  return result;
}
