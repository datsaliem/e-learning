"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CreditCardIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { startCheckout } from "@/features/checkout/actions";
import { useCart } from "@/features/cart/components/cart-provider";
import { safeAction } from "@/lib/safe-action";

export function CheckoutButton() {
  const router = useRouter();
  const { count, isHydrating } = useCart();
  const [isPending, startTransition] = React.useTransition();

  function handleCheckout() {
    startTransition(async () => {
      const result = await safeAction(
        () => startCheckout(),
        "Không thể kết nối máy chủ thanh toán. Vui lòng thử lại.",
      );

      if ("error" in result) {
        if ("code" in result && result.code === "unauthenticated") {
          toast.info(result.error);
          router.push(`/login?next=${encodeURIComponent("/cart")}`);
          return;
        }

        toast.error(result.error);
        return;
      }

      window.location.assign(result.data.url);
    });
  }

  return (
    <Button
      type="button"
      size="lg"
      className="w-full"
      disabled={count === 0 || isHydrating || isPending}
      onClick={handleCheckout}
    >
      {isPending ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" />
      ) : (
        <CreditCardIcon aria-hidden="true" />
      )}
      {isPending ? "Đang tạo đơn hàng..." : "Tiến hành thanh toán"}
    </Button>
  );
}
