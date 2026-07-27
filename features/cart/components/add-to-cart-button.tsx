"use client";

import { CheckIcon, Loader2Icon, ShoppingCartIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { isUuid } from "@/lib/uuid";
import { useCart } from "@/features/cart/components/cart-provider";
import { courseToCartCourse } from "@/features/cart/utils";
import type { Course } from "@/features/courses/types";

export function AddToCartButton({ course }: { course: Course }) {
  const { addCourse, isHydrating, isInCart, isPending, openCart } = useCart();
  const isAvailable = isUuid(course.id);
  const inCart = isInCart(course.id);
  const pending = isPending(course.id);

  return (
    <Button
      type="button"
      size="lg"
      variant={inCart ? "outline" : "default"}
      disabled={!isAvailable || isHydrating || pending}
      onClick={() => (inCart ? openCart() : void addCourse(courseToCartCourse(course)))}
    >
      {pending ? (
        <Loader2Icon className="animate-spin" aria-hidden="true" />
      ) : inCart ? (
        <CheckIcon aria-hidden="true" />
      ) : (
        <ShoppingCartIcon aria-hidden="true" />
      )}
      {!isAvailable
        ? "Khoá học minh hoạ"
        : pending
          ? "Đang thêm..."
          : inCart
            ? "Xem giỏ hàng"
            : "Thêm vào giỏ hàng"}
    </Button>
  );
}
