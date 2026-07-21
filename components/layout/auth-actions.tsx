import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AuthActions({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
        Đăng nhập
      </Button>
      <Button nativeButton={false} render={<Link href="/register" />}>
        Đăng ký
      </Button>
    </div>
  );
}
