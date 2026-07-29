"use server";

import { revalidatePath } from "next/cache";

import {
  categoryMutationSchema,
  deleteCategorySchema,
  reorderCategoriesSchema,
  type CategoryFormInput,
  type DeleteCategoryInput,
} from "@/features/admin-categories/schemas";
import type {
  CategoryDeleteResult,
  CategoryMutationResult,
  CategoryReorderResult,
} from "@/features/admin-categories/types";
import { createClient } from "@/lib/supabase/server";

async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới được quản lý danh mục." } as const;
  }

  return { ok: true, supabase } as const;
}

function refreshCategoryViews() {
  revalidatePath("/admin/categories");
  revalidatePath("/courses");
  revalidatePath("/");
  revalidatePath("/instructor/courses/new");
}

function categoryDatabaseError(error: { code?: string; details?: string | null }): string {
  if (error.code === "23505") {
    return "Slug này đã được sử dụng. Vui lòng chọn slug khác.";
  }

  switch (error.details) {
    case "CATEGORY_PARENT_SELF":
      return "Danh mục không thể là cha của chính nó.";
    case "CATEGORY_PARENT_NOT_FOUND":
      return "Danh mục cha không còn tồn tại.";
    case "CATEGORY_PARENT_CYCLE":
      return "Không thể tạo vòng lặp trong cây danh mục.";
    case "CATEGORY_HAS_CHILDREN":
      return "Hãy chuyển các danh mục con trước khi xóa danh mục này.";
    case "CATEGORY_HAS_COURSES":
      return "Danh mục đang có khóa học. Hãy chọn danh mục nhận dữ liệu trước khi xóa.";
    case "CATEGORY_TRANSFER_SELF":
      return "Danh mục nhận phải khác danh mục đang xóa.";
    case "CATEGORY_TRANSFER_NOT_FOUND":
      return "Danh mục nhận không tồn tại hoặc đang bị tắt.";
    case "CATEGORY_ORDER_INCOMPLETE":
    case "CATEGORY_ORDER_DUPLICATE":
    case "CATEGORY_ORDER_WRONG_PARENT":
      return "Danh sách danh mục đã thay đổi. Vui lòng tải lại trang.";
    default:
      return "Không thể hoàn tất thao tác với danh mục. Vui lòng thử lại.";
  }
}

export async function saveCategory(
  categoryId: string | null,
  values: CategoryFormInput,
): Promise<CategoryMutationResult> {
  const parsed = categoryMutationSchema.safeParse({ categoryId, values });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu danh mục không hợp lệ." };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const categoryValues = {
    name: parsed.data.values.name.trim(),
    slug: parsed.data.values.slug.trim(),
    icon: parsed.data.values.icon,
    parent_id: parsed.data.values.parentId,
    sort_order: parsed.data.values.sortOrder,
    is_active: parsed.data.values.isActive,
  };

  if (!parsed.data.categoryId) {
    const { data, error } = await context.supabase
      .from("categories")
      .insert(categoryValues)
      .select("id")
      .single();

    if (error || !data) {
      return { error: categoryDatabaseError(error ?? {}) };
    }

    refreshCategoryViews();
    return { data: { categoryId: data.id } };
  }

  const { data, error } = await context.supabase
    .from("categories")
    .update(categoryValues)
    .eq("id", parsed.data.categoryId)
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: categoryDatabaseError(error) };
  }
  if (!data) {
    return { error: "Danh mục không tồn tại hoặc bạn không có quyền chỉnh sửa." };
  }

  refreshCategoryViews();
  return { data: { categoryId: data.id } };
}

export async function reorderCategories(
  parentId: string | null,
  categoryIds: string[],
): Promise<CategoryReorderResult> {
  const parsed = reorderCategoriesSchema.safeParse({ parentId, categoryIds });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Thứ tự danh mục không hợp lệ." };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const { error } = await context.supabase.rpc("reorder_categories", {
    p_parent_id: parsed.data.parentId,
    p_category_ids: parsed.data.categoryIds,
  });

  if (error) {
    return { error: categoryDatabaseError(error) };
  }

  refreshCategoryViews();
  return { data: parsed.data };
}

export async function deleteCategory(input: DeleteCategoryInput): Promise<CategoryDeleteResult> {
  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu xóa không hợp lệ." };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const { data, error } = await context.supabase.rpc("delete_admin_category", {
    p_category_id: parsed.data.categoryId,
    p_transfer_category_id: parsed.data.transferCategoryId,
  });

  if (error) {
    return { error: categoryDatabaseError(error) };
  }

  const result = data as {
    categoryId?: unknown;
    transferredCourseCount?: unknown;
  } | null;
  if (
    !result ||
    typeof result.categoryId !== "string" ||
    typeof result.transferredCourseCount !== "number"
  ) {
    return { error: "Database trả về kết quả xóa không hợp lệ." };
  }

  refreshCategoryViews();
  return {
    data: {
      categoryId: result.categoryId,
      transferredCourseCount: result.transferredCourseCount,
    },
  };
}
