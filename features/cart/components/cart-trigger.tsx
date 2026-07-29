"use client";

import { ShoppingCartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/features/cart/components/cart-provider";

export function CartTrigger() {
  const { count, isHydrating, openCart } = useCart();
  const label = count > 0 ? `Mở giỏ hàng, ${count} khoá học` : "Mở giỏ hàng";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="relative"
      aria-label={label}
      disabled={isHydrating}
      onClick={openCart}
    >
      <ShoppingCartIcon aria-hidden="true" />
      {count > 0 && (
        <span className="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-4 font-semibold tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
