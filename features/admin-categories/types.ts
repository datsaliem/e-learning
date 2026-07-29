export interface AdminCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  courseCount: number;
  childCount: number;
  createdAt: string;
  updatedAt: string;
}

export type CategoryMutationResult = { data: { categoryId: string } } | { error: string };

export type CategoryDeleteResult =
  | {
      data: {
        categoryId: string;
        transferredCourseCount: number;
      };
    }
  | { error: string };

export type CategoryReorderResult =
  { data: { parentId: string | null; categoryIds: string[] } } | { error: string };
