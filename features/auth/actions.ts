"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { dashboardPathForRole } from "@/features/auth/queries";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type ForgotPasswordInput,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/features/auth/schemas";
import type { UserRole } from "@/features/auth/types";
import type { ActionResult } from "@/types/actions";

/** Map message lỗi tiếng Anh của Supabase Auth sang tiếng Việt dễ hiểu cho người dùng. */
function mapAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Email hoặc mật khẩu không đúng.",
    "Email not confirmed":
      "Email chưa được xác nhận. Vui lòng kiểm tra hộp thư để xác nhận tài khoản.",
    "User already registered":
      "Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
    "Password should be at least 6 characters": "Mật khẩu quá ngắn.",
    "Email rate limit exceeded": "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.",
    "For security purposes, you can only request this after 60 seconds.":
      "Vui lòng đợi ít nhất 60 giây trước khi thử lại.",
    "New password should be different from the old password.":
      "Mật khẩu mới phải khác mật khẩu cũ.",
  };
  return known[message] ?? "Đã có lỗi xảy ra, vui lòng thử lại.";
}

export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  const role = (profile?.role as UserRole | undefined) ?? "student";

  revalidatePath("/", "layout");
  redirect(dashboardPathForRole(role));
}

export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${env.appUrl}/auth/confirm?next=/dashboard`,
    },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${env.appUrl}/auth/confirm?next=/reset-password`,
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  redirect(`/check-email?email=${encodeURIComponent(parsed.data.email)}&type=recovery`);
}

export async function updatePassword(input: ResetPasswordInput): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Phiên đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu liên kết mới." };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: mapAuthError(error.message) };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=success");
}

export async function resendConfirmationEmail(email: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${env.appUrl}/auth/confirm?next=/dashboard` },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
