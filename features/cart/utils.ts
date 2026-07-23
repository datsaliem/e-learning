import type { Course } from "@/features/courses/types";
import type { CartCourse, CartTotals } from "@/features/cart/types";

export function courseToCartCourse(course: Course): CartCourse {
  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    categorySlug: course.categorySlug,
    categoryLabel: course.categoryLabel,
    thumbnailUrl: null,
    price: course.price,
    originalPrice: course.originalPrice,
  };
}

export function calculateCartTotals(items: CartCourse[]): CartTotals {
  return items.reduce<CartTotals>(
    (totals, item) => {
      const listPrice = item.originalPrice ?? item.price;
      totals.subtotal += listPrice;
      totals.discount += Math.max(0, listPrice - item.price);
      totals.total += item.price;
      return totals;
    },
    { subtotal: 0, discount: 0, total: 0 },
  );
}
