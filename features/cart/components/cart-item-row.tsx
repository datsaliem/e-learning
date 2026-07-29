"use client";

import Link from "next/link";
import { Loader2Icon, Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyVND } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CATEGORY_GRADIENT } from "@/features/courses/constants";
import { useCart } from "@/features/cart/components/cart-provider";
import type { CartCourse } from "@/features/cart/types";

export function CartItemRow({ item, compact = false }: { item: CartCourse; compact?: boolean }) {
  const { isPending, removeCourse, setDrawerOpen } = useCart();
  const pending = isPending(item.id);

  return (
    <article className={cn("flex gap-3", !compact && "rounded-xl border p-3 sm:gap-4 sm:p-4")}>
      <Link
        href={`/courses/${item.slug}`}
        onClick={() => setDrawerOpen(false)}
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br px-2 text-center font-semibold text-white",
          CATEGORY_GRADIENT[item.categorySlug] ?? "from-primary to-primary/60",
          compact ? "h-16 w-24 text-xs" : "h-20 w-28 text-sm sm:h-24 sm:w-36",
        )}
        aria-label={`Xem ${item.title}`}
      >
        {item.categoryLabel}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {!compact && (
          <Badge variant="outline" className="w-fit">
            {item.categoryLabel}
          </Badge>
        )}
        <Link
          href={`/courses/${item.slug}`}
          onClick={() => setDrawerOpen(false)}
          className="hover:text-primary line-clamp-2 leading-snug font-medium transition-colors"
        >
          {item.title}
        </Link>
        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{formatCurrencyVND(item.price)}</span>
            {item.originalPrice && (
              <span className="text-muted-foreground text-xs line-through">
                {formatCurrencyVND(item.originalPrice)}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Xoá ${item.title} khỏi giỏ`}
            disabled={pending}
            onClick={() => void removeCourse(item.id)}
          >
            {pending ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
