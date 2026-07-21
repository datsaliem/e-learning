import type { Metadata } from "next";
import Link from "next/link";
import { MailCheckIcon } from "lucide-react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ResendConfirmationButton } from "@/features/auth/components/resend-confirmation-button";

export const metadata: Metadata = {
  title: "Kiểm tra email",
};

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; type?: string }>;
}) {
  const { email = "", type } = await searchParams;
  const isRecovery = type === "recovery";

  return (
    <AuthCard
      title={isRecovery ? "Kiểm tra email đặt lại mật khẩu" : "Xác nhận email của bạn"}
      description={
        email
          ? `Chúng tôi đã gửi một liên kết đến ${email}.`
          : "Chúng tôi đã gửi một liên kết đến email của bạn."
      }
      footer={
        <p className="text-muted-foreground text-sm">
          Quay lại{" "}
          <Link href="/login" className="text-foreground font-medium hover:underline">
            đăng nhập
          </Link>
        </p>
      }
    >
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
          <MailCheckIcon className="size-6" aria-hidden="true" />
        </span>
        <p className="text-muted-foreground text-sm">
          {isRecovery
            ? "Bấm vào liên kết trong email để đặt lại mật khẩu. Liên kết có hiệu lực trong thời gian giới hạn."
            : "Bấm vào liên kết trong email để xác nhận tài khoản trước khi đăng nhập."}
        </p>
        {!isRecovery && email && <ResendConfirmationButton email={email} />}
      </div>
    </AuthCard>
  );
}
