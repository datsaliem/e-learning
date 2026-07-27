import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon, SlidersHorizontalIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CourseCard } from "@/features/courses/components/course-card";
import { getCourseCatalog, type CourseCatalogSort } from "@/features/courses/services";
import { courseCategories } from "@/lib/nav-config";

export const metadata: Metadata = {
  title: "Tất cả khoá học",
  description: "Khám phá các khoá học trực tuyến theo chủ đề, cấp độ và nhu cầu của bạn.",
};

interface CoursesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function CoursesPage({ searchParams }: CoursesPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim();
  const requestedCategory = firstValue(params.category);
  const category = courseCategories.some((item) =>
    item.href.endsWith(`category=${requestedCategory}`),
  )
    ? requestedCategory
    : "";
  const sort: CourseCatalogSort = firstValue(params.sort) === "newest" ? "newest" : "popular";
  const courses = await getCourseCatalog({ query, category, sort });
  const activeCategory = courseCategories.find((item) =>
    item.href.endsWith(`category=${category}`),
  );
  const hasFilters = Boolean(query || category || sort === "newest");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:py-14">
      <header className="max-w-3xl">
        <p className="text-primary text-sm font-medium">Danh mục học tập</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Khám phá khoá học phù hợp
        </h1>
        <p className="text-muted-foreground mt-3 text-base sm:text-lg">
          Tìm kiếm theo kỹ năng, chủ đề hoặc giảng viên và bắt đầu học theo tốc độ của riêng bạn.
        </p>
      </header>

      <form
        action="/courses"
        method="GET"
        className="bg-card ring-foreground/10 grid gap-4 rounded-xl p-4 ring-1 md:grid-cols-[minmax(0,1fr)_220px_180px_auto]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="catalog-search">Tìm kiếm</Label>
          <div className="relative">
            <SearchIcon
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Tên khoá học, kỹ năng..."
              className="pl-8"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="catalog-category">Danh mục</Label>
          <select
            id="catalog-category"
            name="category"
            defaultValue={category}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
          >
            <option value="">Tất cả danh mục</option>
            {courseCategories.map((item) => {
              const slug = item.href.split("category=")[1] ?? "";
              return (
                <option key={slug} value={slug}>
                  {item.label}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="catalog-sort">Sắp xếp</Label>
          <select
            id="catalog-sort"
            name="sort"
            defaultValue={sort}
            className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-8 w-full rounded-lg border px-2.5 text-sm outline-none focus-visible:ring-3"
          >
            <option value="popular">Phổ biến nhất</option>
            <option value="newest">Mới nhất</option>
          </select>
        </div>

        <Button type="submit" className="self-end">
          <SlidersHorizontalIcon aria-hidden="true" />
          Áp dụng
        </Button>
      </form>

      <section aria-labelledby="course-results-heading">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="course-results-heading" className="text-xl font-semibold">
              {activeCategory?.label ?? "Tất cả khoá học"}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              {courses.length} kết quả{query ? ` cho “${query}”` : ""}
            </p>
          </div>
          {hasFilters && (
            <Button variant="ghost" nativeButton={false} render={<Link href="/courses" />}>
              Xoá bộ lọc
            </Button>
          )}
        </div>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        ) : (
          <div className="border-border bg-muted/30 flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed px-6 text-center">
            <SearchIcon className="text-muted-foreground size-9" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">Chưa tìm thấy khoá học</h2>
            <p className="text-muted-foreground mt-1 max-w-md text-sm">
              Hãy thử từ khoá ngắn hơn hoặc chọn một danh mục khác.
            </p>
            <Button
              className="mt-5"
              variant="outline"
              nativeButton={false}
              render={<Link href="/courses" />}
            >
              Xem tất cả khoá học
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
