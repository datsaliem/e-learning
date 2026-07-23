"use client";

import { Separator } from "@/components/ui/separator";
import { CheckoutButton } from "@/features/checkout/components/checkout-button";
import { formatCurrencyVND } from "@/lib/format";
import { useCart } from "@/features/cart/components/cart-provider";

export function CartSummary({ showCheckout = true }: { showCheckout?: boolean }) {
  const { count, totals } = useCart();

  return (
    <div className="grid gap-3">
      <dl className="grid gap-2 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Tạm tính</dt>
          <dd>{formatCurrencyVND(totals.subtotal)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Giảm giá</dt>
          <dd className={totals.discount > 0 ? "text-success" : undefined}>
            {totals.discount > 0 ? "−" : ""}
            {formatCurrencyVND(totals.discount)}
          </dd>
        </div>
      </dl>
      <Separator />
      <div className="flex items-end justify-between gap-4">
        <span className="font-medium">Tổng cộng</span>
        <span className="text-xl font-semibold">{formatCurrencyVND(totals.total)}</span>
      </div>
      {showCheckout && count > 0 && <CheckoutButton />}
    </div>
  );
}
