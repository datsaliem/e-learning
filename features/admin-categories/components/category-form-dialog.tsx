"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { FolderPlusIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveCategory } from "@/features/admin-categories/actions";
import {
  categoryFormSchema,
  slugifyCategoryName,
  type CategoryFormInput,
} from "@/features/admin-categories/schemas";
import type { AdminCategory } from "@/features/admin-categories/types";
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from "@/features/categories/icons";
import { safeAction } from "@/lib/safe-action";

const ROOT_VALUE = "__root__";

export interface CategoryFormDialogState {
  category: AdminCategory | null;
  parentId: string | null;
}

function descendantsOf(categories: AdminCategory[], categoryId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [categoryId];

  while (queue.length > 0) {
    const parentId = queue.shift();
    for (const category of categories) {
      if (category.parentId === parentId && !descendants.has(category.id)) {
        descendants.add(category.id);
        queue.push(category.id);
      }
    }
  }

  return descendants;
}

function categoryDepth(category: AdminCategory, categoryMap: Map<string, AdminCategory>): number {
  let depth = 0;
  let parentId = category.parentId;
  const visited = new Set([category.id]);

  while (parentId && depth < 8 && !visited.has(parentId)) {
    visited.add(parentId);
    const parent = categoryMap.get(parentId);
    if (!parent) break;
    depth += 1;
    parentId = parent.parentId;
  }

  return depth;
}

export function CategoryFormDialog({
  state,
  categories,
  onOpenChange,
}: {
  state: CategoryFormDialogState | null;
  categories: AdminCategory[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const slugWasEdited = React.useRef(Boolean(state?.category));
  const form = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      slug: "",
      icon: "folder",
      parentId: state?.parentId ?? null,
      sortOrder: 0,
      isActive: true,
    },
  });

  React.useEffect(() => {
    if (!state) return;

    const siblingOrders = categories
      .filter((category) => category.parentId === state.parentId)
      .map((category) => category.sortOrder);
    const nextSortOrder = siblingOrders.length > 0 ? Math.max(...siblingOrders) + 1 : 0;
    slugWasEdited.current = Boolean(state.category);
    form.reset(
      state.category
        ? {
            name: state.category.name,
            slug: state.category.slug,
            icon:
              CATEGORY_ICON_OPTIONS.find((option) => option.value === state.category?.icon)
                ?.value ?? "folder",
            parentId: state.category.parentId,
            sortOrder: state.category.sortOrder,
            isActive: state.category.isActive,
          }
        : {
            name: "",
            slug: "",
            icon: "folder",
            parentId: state.parentId,
            sortOrder: nextSortOrder,
            isActive: true,
          },
    );
  }, [categories, form, state]);

  const name = form.watch("name");
  React.useEffect(() => {
    if (!slugWasEdited.current) {
      form.setValue("slug", slugifyCategoryName(name), {
        shouldDirty: Boolean(name),
        shouldValidate: false,
      });
    }
  }, [form, name]);

  if (!state) return null;

  const excludedIds = state.category
    ? new Set([state.category.id, ...descendantsOf(categories, state.category.id)])
    : new Set<string>();
  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const parentOptions = categories
    .filter((category) => !excludedIds.has(category.id))
    .sort((left, right) => {
      const depthDifference = categoryDepth(left, categoryMap) - categoryDepth(right, categoryMap);
      return (
        depthDifference || left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
      );
    });

  async function onSubmit(values: CategoryFormInput) {
    const result = await safeAction(() => saveCategory(state?.category?.id ?? null, values));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(state?.category ? "Đã cập nhật danh mục." : "Đã tạo danh mục mới.");
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!form.formState.isSubmitting) onOpenChange(open);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <FolderPlusIcon className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>{state.category ? "Chỉnh sửa danh mục" : "Tạo danh mục"}</DialogTitle>
          </div>
          <DialogDescription>
            Danh mục con kế thừa vị trí trong cây nhưng vẫn có slug và trạng thái riêng.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="category-form" className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên danh mục</FormLabel>
                    <FormControl>
                      <Input
                        autoFocus
                        maxLength={80}
                        placeholder="Ví dụ: Phát triển web"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        maxLength={100}
                        placeholder="phat-trien-web"
                        {...field}
                        onChange={(event) => {
                          slugWasEdited.current = true;
                          field.onChange(event);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Danh mục cha</FormLabel>
                    <Select
                      value={field.value ?? ROOT_VALUE}
                      onValueChange={(value) =>
                        field.onChange(value === ROOT_VALUE ? null : String(value))
                      }
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ROOT_VALUE}>Không có — danh mục gốc</SelectItem>
                        {parentOptions.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {"— ".repeat(categoryDepth(category, categoryMap))}
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORY_ICON_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <CategoryIcon
                              name={option.value}
                              className="size-4"
                              aria-hidden="true"
                            />
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Thứ tự</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100000}
                        value={field.value}
                        onChange={(event) => field.onChange(event.currentTarget.valueAsNumber)}
                      />
                    </FormControl>
                    <FormDescription>Có thể thay đổi nhanh bằng kéo thả.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <input
                          id="category-is-active"
                          type="checkbox"
                          checked={field.value}
                          onChange={(event) => field.onChange(event.currentTarget.checked)}
                          className="accent-primary mt-0.5 size-4"
                        />
                      </FormControl>
                      <div>
                        <FormLabel htmlFor="category-is-active">Đang hoạt động</FormLabel>
                        <FormDescription>Hiển thị trong bộ lọc và Course Builder.</FormDescription>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form="category-form" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <SaveIcon aria-hidden="true" />
            )}
            {state.category ? "Lưu thay đổi" : "Tạo danh mục"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
