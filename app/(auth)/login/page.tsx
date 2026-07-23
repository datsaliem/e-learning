import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthStatusToast } from "@/features/auth/components/auth-status-toast";
import { LoginForm } from "@/features/auth/components/login-form";
import { dashboardPathForRole, getCurrentUser } from "@/features/auth/queries";
import { safeNextPath } from "@/features/auth/utils";

export const metadata: Metadata = {
  title: "Đăng nhập",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(next);
  const user = await getCurrentUser();
  if (user) {
    redirect(nextPath ?? dashboardPathForRole(user.role));
  }

  return (
    <>
      <Suspense fallback={null}>
        <AuthStatusToast />
      </Suspense>
      <AuthCard
        title="Đăng nhập"
        description="Đăng nhập để tiếp tục học tập trên E-Learning."
        footer={
          <p className="text-muted-foreground text-sm">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-foreground font-medium hover:underline">
              Đăng ký
            </Link>
          </p>
        }
      >
        <LoginForm nextPath={nextPath ?? undefined} />
      </AuthCard>
    </>
  );
}
