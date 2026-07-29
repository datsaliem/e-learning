"use client";

import Link from "next/link";
import { ShoppingBagIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CartItemRow } from "@/features/cart/components/cart-item-row";
import { CartSummary } from "@/features/cart/components/cart-summary";
import { useCart } from "@/features/cart/components/cart-provider";

export function CartPageView() {
  const { clearCart, count, isHydrating, items } = useCart();

  if (isHydrating) {
    return (
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-4">
          <Skeleton className="h-10 w-56" />
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-32 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <span className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-2xl">
          <ShoppingBagIcon className="size-8" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-semibold">Giỏ hàng của bạn đang trống</h1>
        <p className="text-muted-foreground mt-2 max-w-lg">
          Hãy khám phá các khoá học phù hợp và quay lại đây khi bạn sẵn sàng bắt đầu.
        </p>
        <Button className="mt-6" size="lg" nativeButton={false} render={<Link href="/courses" />}>
          Khám phá khoá học
        </Button>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10" aria-labelledby="cart-heading">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="cart-heading" className="text-3xl font-semibold tracking-tight">
            Giỏ hàng
          </h1>
          <p className="text-muted-foreground mt-1">{count} khoá học đã chọn</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            if (window.confirm("Xoá toàn bộ khoá học khỏi giỏ?")) void clearCart();
          }}
        >
          <Trash2Icon aria-hidden="true" />
          Xoá tất cả
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          {items.map((item) => (
            <CartItemRow key={item.id} item={item} />
          ))}
        </div>

        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>Tóm tắt đơn hàng</CardTitle>
          </CardHeader>
          <CardContent>
            <CartSummary />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
