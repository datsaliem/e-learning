import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient, type User } from "npm:@supabase/supabase-js@2.110.7";

type UserRole = "student" | "instructor" | "admin";
type ManagedUserStatus = "active" | "blocked" | "unverified";

type RequestBody =
  | {
      action: "change_role";
      userId: string;
      role: UserRole;
      reason: string;
    }
  | {
      action: "set_blocked";
      userId: string;
      blocked: boolean;
      reason: string;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLES = new Set<UserRole>(["student", "instructor", "admin"]);
const ACCOUNT_BLOCK_DURATION = "876000h";

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isBlocked(user: User): boolean {
  return Boolean(user.banned_until && new Date(user.banned_until).getTime() > Date.now());
}

function userStatus(user: User): ManagedUserStatus {
  if (isBlocked(user)) return "blocked";
  return user.email_confirmed_at ? "active" : "unverified";
}

function parseBody(value: unknown): { data: RequestBody } | { error: string } {
  if (!value || typeof value !== "object") {
    return { error: "Dữ liệu yêu cầu không hợp lệ." };
  }

  const body = value as Record<string, unknown>;
  if (body.action !== "change_role" && body.action !== "set_blocked") {
    return { error: "Thao tác không hợp lệ." };
  }
  if (typeof body.userId !== "string" || !UUID_PATTERN.test(body.userId)) {
    return { error: "Người dùng không hợp lệ." };
  }
  if (typeof body.reason !== "string") {
    return { error: "Vui lòng nhập lý do." };
  }

  const reason = body.reason.trim();
  if (reason.length < 5 || reason.length > 500) {
    return { error: "Lý do phải có từ 5 đến 500 ký tự." };
  }

  if (body.action === "change_role") {
    if (typeof body.role !== "string" || !ROLES.has(body.role as UserRole)) {
      return { error: "Vai trò không hợp lệ." };
    }

    return {
      data: {
        action: body.action,
        userId: body.userId,
        role: body.role as UserRole,
        reason,
      },
    };
  }

  if (typeof body.blocked !== "boolean") {
    return { error: "Trạng thái tài khoản không hợp lệ." };
  }

  return {
    data: {
      action: body.action,
      userId: body.userId,
      blocked: body.blocked,
      reason,
    },
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Phiên đăng nhập không hợp lệ." }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Dữ liệu JSON không hợp lệ." }, 400);
  }

  const parsed = parseBody(body);
  if ("error" in parsed) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const anonKey = getRequiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorization,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user: actor },
      error: actorError,
    } = await userClient.auth.getUser();
    if (actorError || !actor) {
      return json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." }, 401);
    }

    const { data: actorProfile, error: actorProfileError } = await userClient
      .from("profiles")
      .select("role")
      .eq("id", actor.id)
      .maybeSingle();
    if (actorProfileError || actorProfile?.role !== "admin") {
      return json({ error: "Chỉ quản trị viên mới được thực hiện thao tác này." }, 403);
    }

    if (parsed.data.action === "set_blocked" && parsed.data.userId === actor.id) {
      return json({ error: "Bạn không thể tự khóa tài khoản quản trị đang đăng nhập." }, 400);
    }

    const [{ data: targetAuthData, error: targetAuthError }, targetProfileResult] =
      await Promise.all([
        admin.auth.admin.getUserById(parsed.data.userId),
        admin.from("profiles").select("id, role").eq("id", parsed.data.userId).maybeSingle(),
      ]);

    const targetUser = targetAuthData.user;
    const targetProfile = targetProfileResult.data as {
      id: string;
      role: UserRole;
    } | null;
    if (targetAuthError || !targetUser || targetProfileResult.error || !targetProfile) {
      return json({ error: "Không tìm thấy tài khoản cần cập nhật." }, 404);
    }

    if (parsed.data.action === "change_role") {
      if (targetProfile.role === parsed.data.role) {
        return json({ error: "Tài khoản đã có vai trò này." }, 400);
      }

      const previousMetadata = targetUser.app_metadata ?? {};
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(targetUser.id, {
        app_metadata: {
          ...previousMetadata,
          role: parsed.data.role,
        },
      });
      if (authUpdateError) {
        return json({ error: "Không thể cập nhật quyền đăng nhập của tài khoản." }, 502);
      }

      const { error: profileUpdateError } = await admin
        .from("profiles")
        .update({ role: parsed.data.role })
        .eq("id", targetUser.id);
      if (profileUpdateError) {
        await admin.auth.admin.updateUserById(targetUser.id, {
          app_metadata: previousMetadata,
        });
        return json({ error: "Không thể cập nhật vai trò người dùng." }, 500);
      }

      const { error: auditError } = await admin.from("admin_user_audit_logs").insert({
        actor_id: actor.id,
        actor_email: actor.email ?? "",
        target_user_id: targetUser.id,
        target_email: targetUser.email ?? "",
        action: "role_changed",
        old_values: { role: targetProfile.role },
        new_values: { role: parsed.data.role },
        reason: parsed.data.reason,
      });
      if (auditError) {
        await Promise.all([
          admin.from("profiles").update({ role: targetProfile.role }).eq("id", targetUser.id),
          admin.auth.admin.updateUserById(targetUser.id, {
            app_metadata: previousMetadata,
          }),
        ]);
        return json({ error: "Không thể ghi audit log nên thay đổi đã được hoàn tác." }, 500);
      }

      return json({
        data: {
          userId: targetUser.id,
          role: parsed.data.role,
        },
      });
    }

    const wasBlocked = isBlocked(targetUser);
    if (wasBlocked === parsed.data.blocked) {
      return json(
        {
          error: parsed.data.blocked
            ? "Tài khoản này đã bị khóa."
            : "Tài khoản này đang hoạt động.",
        },
        400,
      );
    }

    const previousStatus = userStatus(targetUser);
    const { data: updatedData, error: updateError } = await admin.auth.admin.updateUserById(
      targetUser.id,
      {
        ban_duration: parsed.data.blocked ? ACCOUNT_BLOCK_DURATION : "none",
      },
    );
    if (updateError || !updatedData.user) {
      return json(
        {
          error: parsed.data.blocked
            ? "Không thể khóa tài khoản. Vui lòng thử lại."
            : "Không thể mở khóa tài khoản. Vui lòng thử lại.",
        },
        502,
      );
    }

    const nextStatus = userStatus(updatedData.user);
    const { error: auditError } = await admin.from("admin_user_audit_logs").insert({
      actor_id: actor.id,
      actor_email: actor.email ?? "",
      target_user_id: targetUser.id,
      target_email: targetUser.email ?? "",
      action: parsed.data.blocked ? "account_blocked" : "account_unblocked",
      old_values: {
        status: previousStatus,
        bannedUntil: targetUser.banned_until ?? null,
      },
      new_values: {
        status: nextStatus,
        bannedUntil: updatedData.user.banned_until ?? null,
      },
      reason: parsed.data.reason,
    });
    if (auditError) {
      await admin.auth.admin.updateUserById(targetUser.id, {
        ban_duration: wasBlocked ? ACCOUNT_BLOCK_DURATION : "none",
      });
      return json({ error: "Không thể ghi audit log nên thay đổi đã được hoàn tác." }, 500);
    }

    return json({
      data: {
        userId: targetUser.id,
        status: nextStatus,
      },
    });
  } catch (error) {
    console.error("admin-user-management failed", error);
    return json({ error: "Không thể xử lý yêu cầu quản trị lúc này." }, 500);
  }
});
