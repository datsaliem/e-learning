"use client";

import * as React from "react";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { useSortable } from "@dnd-kit/react/sortable";
import {
  BookOpenIcon,
  EllipsisVerticalIcon,
  FolderPlusIcon,
  GripVerticalIcon,
  Layers3Icon,
  Loader2Icon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { reorderCategories } from "@/features/admin-categories/actions";
import type { AdminCategory } from "@/features/admin-categories/types";
import { CategoryIcon } from "@/features/categories/icons";
import { safeAction } from "@/lib/safe-action";
import { cn } from "@/lib/utils";

const ROOT_GROUP = "__root__";

function categoryGroup(category: AdminCategory): string {
  return category.parentId ?? ROOT_GROUP;
}

function sortedSiblings(categories: AdminCategory[], parentId: string | null): AdminCategory[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt.localeCompare(right.createdAt) ||
        left.id.localeCompare(right.id),
    );
}

function SortableCategoryCard({
  category,
  index,
  depth,
  disabled,
  onEdit,
  onAddChild,
  onDelete,
}: {
  category: AdminCategory;
  index: number;
  depth: number;
  disabled: boolean;
  onEdit: () => void;
  onAddChild: () => void;
  onDelete: () => void;
}) {
  const group = categoryGroup(category);
  const type = `category:${group}`;
  const { ref, handleRef, isDragging } = useSortable({
    id: category.id,
    index,
    group,
    type,
    accept: type,
    disabled,
  });

  return (
    <article
      ref={ref}
      className={cn(
        "bg-card flex items-center gap-2 rounded-xl border p-3 shadow-xs transition-opacity sm:gap-3",
        depth > 0 && "bg-muted/15",
        isDragging && "opacity-45",
      )}
    >
      <button
        ref={handleRef}
        type="button"
        disabled={disabled}
        aria-label={`Kéo để sắp xếp danh mục ${category.name}`}
        className="text-muted-foreground hover:bg-muted focus-visible:ring-ring flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg outline-none focus-visible:ring-3 active:cursor-grabbing disabled:cursor-not-allowed"
      >
        <GripVerticalIcon aria-hidden="true" />
      </button>

      <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <CategoryIcon name={category.icon} className="size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{category.name}</h3>
          <Badge variant={category.isActive ? "success" : "secondary"}>
            {category.isActive ? "Hoạt động" : "Đã tắt"}
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1 truncate font-mono text-xs">/{category.slug}</p>
      </div>

      <div className="text-muted-foreground hidden items-center gap-3 text-xs sm:flex">
        <span className="flex items-center gap-1">
          <BookOpenIcon className="size-3.5" aria-hidden="true" />
          {category.courseCount}
        </span>
        <span className="flex items-center gap-1">
          <Layers3Icon className="size-3.5" aria-hidden="true" />
          {category.childCount}
        </span>
        <span className="min-w-8 text-right">#{category.sortOrder}</span>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              aria-label={`Thao tác với ${category.name}`}
            />
          }
        >
          <EllipsisVerticalIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon aria-hidden="true" />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddChild}>
            <FolderPlusIcon aria-hidden="true" />
            Thêm danh mục con
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon aria-hidden="true" />
            Xóa danh mục
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </article>
  );
}

function CategoryBranch({
  categories,
  parentId,
  depth,
  disabled,
  onEdit,
  onAddChild,
  onDelete,
}: {
  categories: AdminCategory[];
  parentId: string | null;
  depth: number;
  disabled: boolean;
  onEdit: (category: AdminCategory) => void;
  onAddChild: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
}) {
  const siblings = sortedSiblings(categories, parentId);
  if (siblings.length === 0) return null;

  return (
    <ul
      role={depth === 0 ? "tree" : "group"}
      className={cn("grid gap-3", depth > 0 && "border-border mt-3 ml-5 border-l pl-4 sm:ml-8")}
    >
      {siblings.map((category, index) => (
        <li
          key={category.id}
          role="treeitem"
          aria-level={depth + 1}
          aria-selected="false"
        >
          <SortableCategoryCard
            category={category}
            index={index}
            depth={depth}
            disabled={disabled}
            onEdit={() => onEdit(category)}
            onAddChild={() => onAddChild(category)}
            onDelete={() => onDelete(category)}
          />
          <CategoryBranch
            categories={categories}
            parentId={category.id}
            depth={depth + 1}
            disabled={disabled}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onDelete={onDelete}
          />
        </li>
      ))}
    </ul>
  );
}

export function CategoryTree({
  categories,
  onCategoriesChange,
  onEdit,
  onAddChild,
  onDelete,
}: {
  categories: AdminCategory[];
  onCategoriesChange: (categories: AdminCategory[]) => void;
  onEdit: (category: AdminCategory) => void;
  onAddChild: (category: AdminCategory) => void;
  onDelete: (category: AdminCategory) => void;
}) {
  const [isReordering, setIsReordering] = React.useState(false);

  async function handleDragEnd(event: DragEndEvent) {
    const source = event.operation.source;
    if (!source || event.canceled || !String(source.type).startsWith("category:")) return;

    const sourceCategory = categories.find((category) => category.id === String(source.id));
    if (!sourceCategory) return;

    const groupMap = Object.fromEntries(
      [...new Set(categories.map(categoryGroup))].map((group) => [
        group,
        categories
          .filter((category) => categoryGroup(category) === group)
          .sort((left, right) => left.sortOrder - right.sortOrder),
      ]),
    );
    const movedGroups = move(groupMap, event) as Record<string, AdminCategory[]>;
    const group = categoryGroup(sourceCategory);
    const movedSiblings = movedGroups[group];
    if (!movedSiblings) return;

    const previousIds = groupMap[group]?.map((category) => category.id) ?? [];
    const nextIds = movedSiblings.map((category) => category.id);
    if (previousIds.join("|") === nextIds.join("|")) return;

    const previous = categories;
    const next = categories.map((category) => {
      const sortOrder = nextIds.indexOf(category.id);
      return sortOrder >= 0 ? { ...category, sortOrder } : category;
    });

    onCategoriesChange(next);
    setIsReordering(true);
    const result = await safeAction(() => reorderCategories(sourceCategory.parentId, nextIds));
    setIsReordering(false);

    if ("error" in result) {
      onCategoriesChange(previous);
      toast.error(result.error);
      return;
    }

    toast.success("Đã lưu thứ tự danh mục.");
  }

  return (
    <div aria-busy={isReordering}>
      {isReordering ? (
        <p
          className="text-primary mb-3 flex items-center justify-end gap-1.5 text-sm"
          role="status"
        >
          <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
          Đang lưu thứ tự
        </p>
      ) : null}
      <DragDropProvider onDragEnd={(event) => void handleDragEnd(event)}>
        <CategoryBranch
          categories={categories}
          parentId={null}
          depth={0}
          disabled={isReordering}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onDelete={onDelete}
        />
      </DragDropProvider>
    </div>
  );
}
