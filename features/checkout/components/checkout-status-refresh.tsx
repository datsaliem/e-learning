"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function CheckoutStatusRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  React.useEffect(() => {
    if (!active) return;

    let refreshCount = 0;
    const interval = window.setInterval(() => {
      refreshCount += 1;
      router.refresh();
      if (refreshCount >= 12) window.clearInterval(interval);
    }, 2500);

    return () => window.clearInterval(interval);
  }, [active, router]);

  if (!active) return null;
  return (
    <p className="text-muted-foreground text-sm" aria-live="polite">
      Trang sẽ tự cập nhật khi webhook xác nhận giao dịch.
    </p>
  );
}
