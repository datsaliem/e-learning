import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Trang này chỉ dùng được khi vừa xác nhận liên kết đặt lại mật khẩu từ
  // email (route /auth/confirm thiết lập session tạm thời). Truy cập trực
  // tiếp mà không có session hợp lệ thì đưa về trang yêu cầu liên kết mới.
  if (!user) {
    redirect("/forgot-password");
  }

  return (
    <AuthCard title="Đặt lại mật khẩu" description="Nhập mật khẩu mới cho tài khoản của bạn.">
      <ResetPasswordForm />
    </AuthCard>
  );
}
