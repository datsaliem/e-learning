import Link from "next/link";
import { ArrowLeftIcon, SearchIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-primary text-sm font-semibold">404</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        Không tìm thấy trang
      </h1>
      <p className="text-muted-foreground mt-3 max-w-lg">
        Đường dẫn có thể đã thay đổi hoặc nội dung chưa được xuất bản. Bạn có thể quay về trang chủ
        hoặc tiếp tục khám phá khoá học.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeftIcon aria-hidden="true" />
          Về trang chủ
        </Button>
        <Button nativeButton={false} render={<Link href="/courses" />}>
          <SearchIcon aria-hidden="true" />
          Khám phá khoá học
        </Button>
      </div>
    </div>
  );
}
