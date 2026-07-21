import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/components/auth-card";
import { RegisterForm } from "@/features/auth/components/register-form";
import { dashboardPathForRole, getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Đăng ký",
};

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(dashboardPathForRole(user.role));
  }

  return (
    <AuthCard
      title="Tạo tài khoản"
      description="Đăng ký để bắt đầu học tập trên E-Learning."
      footer={
        <p className="text-muted-foreground text-sm">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            Đăng nhập
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
