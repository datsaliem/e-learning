import type { Metadata } from "next";

import { AdminCategoriesPage } from "@/features/admin-categories/components/admin-categories-page";
import { getAdminCategories } from "@/features/admin-categories/queries";
import { requireRole } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Quản lý danh mục",
  description: "Quản lý taxonomy cha–con và thứ tự danh mục khóa học.",
};

export const dynamic = "force-dynamic";

export default async function AdminCategoriesRoute() {
  await requireRole("admin");
  const categories = await getAdminCategories();

  return <AdminCategoriesPage initialCategories={categories} />;
}
