import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenIcon, KeyRoundIcon, UserRoundIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Cài đặt tài khoản",
  description: "Quản lý hồ sơ, bảo mật và các khu vực học tập của tài khoản.",
};

const settingsLinks = [
  {
    title: "Hồ sơ cá nhân",
    description: "Cập nhật tên, ảnh đại diện, giới thiệu và thông tin liên hệ.",
    href: "/profile",
    label: "Mở hồ sơ",
    icon: UserRoundIcon,
  },
  {
    title: "Bảo mật",
    description: "Gửi liên kết đặt lại mật khẩu tới email đã đăng ký.",
    href: "/forgot-password",
    label: "Đổi mật khẩu",
    icon: KeyRoundIcon,
  },
  {
    title: "Khoá học của tôi",
    description: "Xem khoá học đang học, đã hoàn thành và đã hết hạn.",
    href: "/my-courses",
    label: "Xem khoá học",
    icon: BookOpenIcon,
  },
] as const;

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10 sm:py-14">
      <header>
        <p className="text-primary text-sm font-medium">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground mt-2">
          Đang đăng nhập với <span className="text-foreground font-medium">{user.email}</span>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((item) => (
          <Card key={item.href}>
            <CardHeader>
              <div className="bg-muted text-foreground mb-2 flex size-10 items-center justify-center rounded-lg">
                <item.icon className="size-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" nativeButton={false} render={<Link href={item.href} />}>
                {item.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
