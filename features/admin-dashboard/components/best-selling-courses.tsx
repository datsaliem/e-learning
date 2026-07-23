import { BookDashedIcon, TrophyIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BestSellingCourse } from "@/features/admin-dashboard/types";
import { formatCompactNumber, formatCurrencyVND } from "@/lib/format";

function CourseThumbnail({ course }: { course: BestSellingCourse }) {
  return (
    <div
      className="from-primary/25 to-secondary/30 flex size-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br bg-cover bg-center"
      style={
        course.thumbnailUrl
          ? { backgroundImage: `url(${JSON.stringify(course.thumbnailUrl)})` }
          : undefined
      }
      aria-hidden="true"
    >
      {!course.thumbnailUrl && <BookDashedIcon className="text-primary size-5" />}
    </div>
  );
}

export function BestSellingCourses({ courses }: { courses: BestSellingCourse[] }) {
  const maxSales = Math.max(...courses.map((course) => course.salesCount), 1);

  return (
    <Card id="best-selling" className="scroll-mt-36">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrophyIcon className="text-warning size-4" aria-hidden="true" />
          Khóa học bán chạy
        </CardTitle>
        <CardDescription>Xếp hạng theo số lượt bán từ các đơn hàng đã thanh toán.</CardDescription>
      </CardHeader>
      <CardContent>
        {courses.length === 0 ? (
          <div className="border-border flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <span className="bg-warning/10 text-warning flex size-12 items-center justify-center rounded-full">
              <TrophyIcon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-medium">Chưa có dữ liệu bán hàng</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Bảng xếp hạng sẽ xuất hiện khi có đơn hàng thanh toán thành công.
            </p>
          </div>
        ) : (
          <ol className="space-y-5" aria-label="5 khóa học bán chạy nhất">
            {courses.map((course, index) => {
              const width = (course.salesCount / maxSales) * 100;

              return (
                <li key={course.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <CourseThumbnail course={course} />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{course.title}</p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {formatCompactNumber(course.salesCount)} lượt bán
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center gap-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-muted-foreground">Doanh thu</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrencyVND(course.revenue)}
                      </span>
                    </div>
                    <div
                      className="bg-muted h-2 overflow-hidden rounded-full"
                      role="progressbar"
                      aria-label={`${course.title}: ${course.salesCount} lượt bán`}
                      aria-valuemin={0}
                      aria-valuemax={maxSales}
                      aria-valuenow={course.salesCount}
                    >
                      <div
                        className="from-primary to-secondary h-full rounded-full bg-gradient-to-r"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
