import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CtaSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <div className="bg-primary text-primary-foreground flex flex-col items-center gap-6 rounded-2xl px-6 py-16 text-center">
        <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-balance">
          Sẵn sàng bắt đầu hành trình học tập của bạn?
        </h2>
        <p className="text-primary-foreground/80 max-w-lg">
          Đăng ký miễn phí ngay hôm nay và truy cập hàng trăm khoá học chất lượng cùng cộng đồng học
          viên năng động.
        </p>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={<Link href="/register" />}
        >
          Đăng ký miễn phí
        </Button>
      </div>
    </section>
  );
}
