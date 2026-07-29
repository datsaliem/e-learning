"use client";

import Link from "next/link";
import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCart } from "@/features/cart/components/cart-provider";

export function CartDrawer() {
  const { count, drawerOpen, isHydrating, items, setDrawerOpen } = useCart();

  return (
    <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>Giỏ hàng ({count})</SheetTitle>
          <SheetDescription>Kiểm tra các khoá học trước khi thanh toán.</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4">
          {isHydrating ? (
            <div className="grid gap-4 py-2" aria-label="Đang tải giỏ hàng">
              {[0, 1, 2].map((item) => (
                <div key={item} className="flex gap-3">
                  <Skeleton className="h-16 w-24 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-auto h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="grid gap-4 py-2">
              {items.map((item) => (
                <CartItemRow key={item.id} item={item} compact />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <span className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
                <ShoppingBagIcon aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-semibold">Giỏ hàng đang trống</h3>
              <p className="text-muted-foreground mt-1 max-w-xs text-sm">
                Khám phá catalog và thêm khoá học phù hợp với mục tiêu của bạn.
              </p>
              <Button
                className="mt-5"
                nativeButton={false}
                render={<Link href="/courses" onClick={() => setDrawerOpen(false)} />}
              >
                Khám phá khoá học
              </Button>
            </div>
          )}
        </div>

        {items.length > 0 && !isHydrating && (
          <SheetFooter className="border-t">
            <CartSummary showCheckout={false} />
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/cart" onClick={() => setDrawerOpen(false)} />}
            >
              Xem giỏ hàng
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
