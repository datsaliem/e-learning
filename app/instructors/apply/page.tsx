import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  BookOpenCheckIcon,
  CircleCheckIcon,
  UserRoundCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Trở thành giảng viên",
  description: "Chuẩn bị hồ sơ và xây dựng khoá học của bạn trên E-Learning.",
  alternates: {
    canonical: "/instructors/apply",
  },
};

const steps = [
  {
    title: "Hoàn thiện hồ sơ",
    description: "Cập nhật chuyên môn, kinh nghiệm, ảnh đại diện và phần giới thiệu rõ ràng.",
    icon: UserRoundCheckIcon,
  },
  {
    title: "Xây dựng khoá học",
    description: "Tạo đề cương, bài học, video và tài liệu đi kèm trong Course Builder.",
    icon: BookOpenCheckIcon,
  },
  {
    title: "Gửi duyệt",
    description:
      "Kiểm tra nội dung, bản quyền tài liệu và gửi khoá học cho quản trị viên phê duyệt.",
    icon: CircleCheckIcon,
  },
] as const;

export default async function InstructorApplyPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/profile" : "/register?next=/instructors/apply";
  const ctaLabel = user ? "Hoàn thiện hồ sơ" : "Tạo tài khoản";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-12 sm:py-16">
      <section className="from-primary/10 via-background to-secondary/10 ring-foreground/10 overflow-hidden rounded-2xl bg-gradient-to-br px-6 py-12 text-center ring-1 sm:px-12">
        <p className="text-primary text-sm font-medium">Dành cho chuyên gia và nhà giáo dục</p>
        <h1 className="mx-auto mt-3 max-w-3xl text-3xl font-semibold tracking-tight sm:text-5xl">
          Chia sẻ kiến thức, tạo giá trị cho cộng đồng học tập
        </h1>
        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-base sm:text-lg">
          Xây dựng nội dung có cấu trúc, quản lý chương trình học và theo dõi hiệu quả khoá học trên
          một nền tảng thống nhất.
        </p>
        <Button size="lg" className="mt-7" nativeButton={false} render={<Link href={ctaHref} />}>
          {ctaLabel}
          <ArrowRightIcon aria-hidden="true" />
        </Button>
      </section>

      <section aria-labelledby="instructor-process-heading">
        <div className="max-w-2xl">
          <h2 id="instructor-process-heading" className="text-2xl font-semibold tracking-tight">
            Quy trình bắt đầu
          </h2>
          <p className="text-muted-foreground mt-2">
            Ba bước để chuẩn bị một khoá học có chất lượng trước khi xuất bản.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card key={step.title}>
              <CardHeader>
                <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
                  <step.icon className="size-5" aria-hidden="true" />
                </div>
                <p className="text-muted-foreground text-xs font-medium">Bước {index + 1}</p>
                <CardTitle className="text-lg">{step.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">{step.description}</CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
