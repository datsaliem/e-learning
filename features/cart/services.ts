import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { COURSE_CATEGORY_OPTIONS } from "@/features/course-builder/constants";
import { getCourseById } from "@/features/courses/services";
import { courseToCartCourse } from "@/features/cart/utils";
import type { CartCourse } from "@/features/cart/types";

function categoryLabel(category: string | null): string {
  return (
    COURSE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ??
    category ??
    "Khoá học"
  );
}

/**
 * Resolve lại dữ liệu giá ở server. localStorage/database chỉ giữ course id,
 * vì vậy người dùng không thể sửa giá trên client để làm sai tổng tiền.
 */
export async function getCartCoursesByIds(courseIds: string[]): Promise<CartCourse[]> {
  const uniqueIds = [...new Set(courseIds)];
  if (uniqueIds.length === 0) return [];

  const mockEntries = await Promise.all(
    uniqueIds.map(async (id) => {
      const course = await getCourseById(id);
      return course ? ([id, courseToCartCourse(course)] as const) : null;
    }),
  );
  const coursesById = new Map<string, CartCourse>(
    mockEntries.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
  );

  const databaseIds = uniqueIds.filter((id) => !coursesById.has(id) && isUuid(id));
  if (databaseIds.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("courses")
      .select("id, slug, title, category, thumbnail_url, price, sale_price")
      .in("id", databaseIds)
      .eq("status", "published");

    for (const course of data ?? []) {
      const listPrice = Number(course.price);
      const salePrice = course.sale_price === null ? null : Number(course.sale_price);
      coursesById.set(course.id, {
        id: course.id,
        slug: course.slug ?? course.id,
        title: course.title,
        categorySlug: course.category ?? "khoa-hoc",
        categoryLabel: categoryLabel(course.category),
        thumbnailUrl: course.thumbnail_url,
        price: salePrice ?? listPrice,
        ...(salePrice === null ? {} : { originalPrice: listPrice }),
      });
    }
  }

  return uniqueIds.flatMap((id) => {
    const course = coursesById.get(id);
    return course ? [course] : [];
  });
}

export async function getCartCourseById(courseId: string): Promise<CartCourse | null> {
  return (await getCartCoursesByIds([courseId]))[0] ?? null;
}
