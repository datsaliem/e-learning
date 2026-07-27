"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteCategory } from "@/features/admin-categories/actions";
import type { AdminCategory } from "@/features/admin-categories/types";
import { safeAction } from "@/lib/safe-action";

const NO_TRANSFER = "__none__";

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

export function DeleteCategoryDialog({
  category,
  categories,
  onOpenChange,
}: {
  category: AdminCategory | null;
  categories: AdminCategory[];
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [transferCategoryId, setTransferCategoryId] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    setTransferCategoryId(null);
  }, [category]);

  if (!category) return null;

  const excluded = new Set([category.id, ...descendantsOf(categories, category.id)]);
  const transferOptions = categories
    .filter((candidate) => candidate.isActive && !excluded.has(candidate.id))
    .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name));
  const hasChildren = category.childCount > 0;
  const needsTransfer = category.courseCount > 0;

  async function confirmDelete() {
    if (hasChildren) {
      toast.error("Hãy chuyển các danh mục con trước khi xóa.");
      return;
    }
    if (needsTransfer && !transferCategoryId) {
      toast.error("Vui lòng chọn danh mục nhận khóa học.");
      return;
    }

    setIsSubmitting(true);
    const result = await safeAction(() =>
      deleteCategory({
        categoryId: category?.id ?? "",
        transferCategoryId,
      }),
    );
    setIsSubmitting(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(
      result.data.transferredCourseCount > 0
        ? `Đã chuyển ${result.data.transferredCourseCount} khóa học và xóa danh mục.`
        : "Đã xóa danh mục.",
    );
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!isSubmitting) onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-destructive/10 text-destructive flex size-9 items-center justify-center rounded-lg">
              <Trash2Icon className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>Xóa danh mục</DialogTitle>
          </div>
          <DialogDescription>
            Bạn đang xóa “{category.name}”. Thao tác này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        {hasChildren ? (
          <Alert variant="destructive">
            <AlertTriangleIcon aria-hidden="true" />
            <AlertDescription>
              Danh mục có {category.childCount} danh mục con. Hãy chỉnh sửa và chuyển chúng sang
              danh mục cha khác trước.
            </AlertDescription>
          </Alert>
        ) : null}

        {needsTransfer && !hasChildren ? (
          <div className="grid gap-2">
            <Label htmlFor="category-transfer-target">
              Chuyển {category.courseCount} khóa học sang
            </Label>
            <Select
              value={transferCategoryId ?? NO_TRANSFER}
              onValueChange={(value) =>
                setTransferCategoryId(value === NO_TRANSFER ? null : String(value))
              }
            >
              <SelectTrigger id="category-transfer-target" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_TRANSFER} disabled>
                  Chọn danh mục nhận dữ liệu
                </SelectItem>
                {transferOptions.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              Việc chuyển khóa học và xóa category chạy trong cùng một transaction.
            </p>
          </div>
        ) : null}

        {!hasChildren && !needsTransfer ? (
          <p className="text-muted-foreground text-sm">
            Danh mục chưa có khóa học hoặc danh mục con nên có thể xóa an toàn.
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={
              isSubmitting ||
              hasChildren ||
              (needsTransfer && (!transferCategoryId || transferOptions.length === 0))
            }
            onClick={() => void confirmDelete()}
          >
            {isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon aria-hidden="true" />
            )}
            Xác nhận xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
