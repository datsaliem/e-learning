import { z } from "zod";

import { CATEGORY_ICON_OPTIONS, type CategoryIconKey } from "@/features/categories/icons";

const categoryIconValues = CATEGORY_ICON_OPTIONS.map((option) => option.value) as [
  CategoryIconKey,
  ...CategoryIconKey[],
];

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Tên danh mục phải có ít nhất 2 ký tự.")
    .max(80, "Tên danh mục không được vượt quá 80 ký tự."),
  slug: z
    .string()
    .trim()
    .min(2, "Slug phải có ít nhất 2 ký tự.")
    .max(100, "Slug không được vượt quá 100 ký tự.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang."),
  icon: z.enum(categoryIconValues),
  parentId: z.string().uuid("Danh mục cha không hợp lệ.").nullable(),
  sortOrder: z
    .number({ error: "Thứ tự phải là một số." })
    .int("Thứ tự phải là số nguyên.")
    .min(0, "Thứ tự không được âm.")
    .max(100000, "Thứ tự vượt quá giới hạn."),
  isActive: z.boolean(),
});

export const categoryMutationSchema = z
  .object({
    categoryId: z.string().uuid("Danh mục không hợp lệ.").nullable(),
    values: categoryFormSchema,
  })
  .superRefine((input, context) => {
    if (input.categoryId && input.categoryId === input.values.parentId) {
      context.addIssue({
        code: "custom",
        path: ["values", "parentId"],
        message: "Danh mục không thể là cha của chính nó.",
      });
    }
  });

export const deleteCategorySchema = z
  .object({
    categoryId: z.string().uuid("Danh mục không hợp lệ."),
    transferCategoryId: z.string().uuid("Danh mục nhận không hợp lệ.").nullable(),
  })
  .superRefine((input, context) => {
    if (input.transferCategoryId === input.categoryId) {
      context.addIssue({
        code: "custom",
        path: ["transferCategoryId"],
        message: "Danh mục nhận phải khác danh mục đang xóa.",
      });
    }
  });

export const reorderCategoriesSchema = z
  .object({
    parentId: z.string().uuid("Danh mục cha không hợp lệ.").nullable(),
    categoryIds: z.array(z.string().uuid()).max(500),
  })
  .superRefine((input, context) => {
    if (new Set(input.categoryIds).size !== input.categoryIds.length) {
      context.addIssue({
        code: "custom",
        path: ["categoryIds"],
        message: "Danh sách sắp xếp chứa danh mục trùng lặp.",
      });
    }
  });

export function slugifyCategoryName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;
export type DeleteCategoryInput = z.infer<typeof deleteCategorySchema>;
