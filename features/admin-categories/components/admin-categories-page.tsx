"use client";

import * as React from "react";
import {
  BookOpenIcon,
  CheckCircle2Icon,
  FolderTreeIcon,
  Layers3Icon,
  PlusIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CategoryFormDialog,
  type CategoryFormDialogState,
} from "@/features/admin-categories/components/category-form-dialog";
import { CategoryTree } from "@/features/admin-categories/components/category-tree";
import { DeleteCategoryDialog } from "@/features/admin-categories/components/delete-category-dialog";
import type { AdminCategory } from "@/features/admin-categories/types";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof FolderTreeIcon;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-muted-foreground text-xs">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminCategoriesPage({ initialCategories }: { initialCategories: AdminCategory[] }) {
  const [categories, setCategories] = React.useState(initialCategories);
  const [formState, setFormState] = React.useState<CategoryFormDialogState | null>(null);
  const [deleteCategory, setDeleteCategory] = React.useState<AdminCategory | null>(null);

  React.useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const rootCount = categories.filter((category) => category.parentId === null).length;
  const activeCount = categories.filter((category) => category.isActive).length;
  const courseCount = categories.reduce((total, category) => total + category.courseCount, 0);

  return (
    <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="text-primary mb-2 flex items-center gap-2 text-sm font-medium">
            <FolderTreeIcon className="size-4" aria-hidden="true" />
            Taxonomy khóa học
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Quản lý danh mục</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Tổ chức category cha–con, kiểm soát trạng thái và kéo thả để sắp xếp từng cấp.
          </p>
        </div>
        <Button onClick={() => setFormState({ category: null, parentId: null })}>
          <PlusIcon aria-hidden="true" />
          Thêm danh mục
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Thống kê danh mục">
        <StatCard label="Tổng danh mục" value={categories.length} icon={FolderTreeIcon} />
        <StatCard label="Danh mục gốc" value={rootCount} icon={Layers3Icon} />
        <StatCard label="Đang hoạt động" value={activeCount} icon={CheckCircle2Icon} />
        <StatCard label="Khóa học đã gắn" value={courseCount} icon={BookOpenIcon} />
      </section>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Cây danh mục</CardTitle>
            <CardDescription>
              Kéo trong cùng một cấp để đổi thứ tự. Dùng Chỉnh sửa để đổi danh mục cha.
            </CardDescription>
          </div>
          <Badge variant="outline">{categories.length} mục</Badge>
        </CardHeader>
        <CardContent>
          {categories.length > 0 ? (
            <CategoryTree
              categories={categories}
              onCategoriesChange={setCategories}
              onEdit={(category) => setFormState({ category, parentId: category.parentId })}
              onAddChild={(category) => setFormState({ category: null, parentId: category.id })}
              onDelete={setDeleteCategory}
            />
          ) : (
            <div className="border-border bg-muted/20 flex min-h-72 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
              <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-xl">
                <FolderTreeIcon aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-semibold">Chưa có danh mục</h2>
              <p className="text-muted-foreground mt-1 max-w-md text-sm">
                Tạo danh mục gốc đầu tiên để bắt đầu tổ chức catalog khóa học.
              </p>
              <Button
                className="mt-5"
                onClick={() => setFormState({ category: null, parentId: null })}
              >
                <PlusIcon aria-hidden="true" />
                Tạo danh mục
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CategoryFormDialog
        state={formState}
        categories={categories}
        onOpenChange={(open) => !open && setFormState(null)}
      />
      <DeleteCategoryDialog
        category={deleteCategory}
        categories={categories}
        onOpenChange={(open) => !open && setDeleteCategory(null)}
      />
    </main>
  );
}
