import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { SectionHeading } from "@/components/shared/section-heading";
import type { CourseCategory } from "@/features/courses/types";

export function FeaturedCategories({ categories }: { categories: CourseCategory[] }) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16">
      <SectionHeading title="Danh mục nổi bật" description="Chọn lĩnh vực bạn muốn phát triển." />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Link key={category.slug} href={`/courses?category=${category.slug}`}>
              <Card className="hover:border-primary/50 h-full transition-colors">
                <CardContent className="flex flex-col items-center gap-2 text-center">
                  {Icon && (
                    <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-full">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  )}
                  <span className="text-sm font-medium">{category.label}</span>
                  <span className="text-muted-foreground text-xs">
                    {category.courseCount} khoá học
                  </span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
