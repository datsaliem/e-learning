import "server-only";

import type { CourseCategoryOption } from "@/features/categories/types";
import { createClient } from "@/lib/supabase/server";

interface CategoryOptionRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}

export async function getCourseCategoryOptions(): Promise<CourseCategoryOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, parent_id, name, slug, icon, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error("Không thể tải danh mục khóa học.");
  }

  const rows = (data ?? []) as CategoryOptionRow[];
  const rowIds = new Set(rows.map((category) => category.id));
  const childrenByParent = new Map<string | null, CategoryOptionRow[]>();

  for (const category of rows) {
    const parentId =
      category.parent_id && rowIds.has(category.parent_id) ? category.parent_id : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(category);
    childrenByParent.set(parentId, siblings);
  }

  const options: CourseCategoryOption[] = [];
  const visited = new Set<string>();
  function appendChildren(parentId: string | null, depth: number) {
    for (const category of childrenByParent.get(parentId) ?? []) {
      if (visited.has(category.id)) continue;
      visited.add(category.id);
      options.push({
        id: category.id,
        value: category.slug,
        name: category.name,
        label: `${"— ".repeat(depth)}${category.name}`,
        icon: category.icon,
        depth,
      });
      appendChildren(category.id, Math.min(depth + 1, 8));
    }
  }

  appendChildren(null, 0);
  return options;
}
