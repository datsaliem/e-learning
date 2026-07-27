import "server-only";

import { z } from "zod";

import type { AdminCategory } from "@/features/admin-categories/types";
import { createClient } from "@/lib/supabase/server";

const adminCategoryRowSchema = z.object({
  id: z.string().uuid(),
  parent_id: z.string().uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  icon: z.string(),
  sort_order: z.coerce.number().int().nonnegative(),
  is_active: z.boolean(),
  course_count: z.coerce.number().int().nonnegative(),
  child_count: z.coerce.number().int().nonnegative(),
  created_at: z.string(),
  updated_at: z.string(),
});

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_admin_categories");

  if (error) {
    throw new Error("Không thể tải danh sách danh mục. Vui lòng thử lại sau.");
  }

  const parsed = z.array(adminCategoryRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    throw new Error("Dữ liệu danh mục không đúng định dạng.");
  }

  return parsed.data.map((category) => ({
    id: category.id,
    parentId: category.parent_id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    sortOrder: category.sort_order,
    isActive: category.is_active,
    courseCount: category.course_count,
    childCount: category.child_count,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  }));
}
