import Link from "next/link";
import { ArrowUpRightIcon, BookDashedIcon, StarIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  InstructorCourseStatus,
  InstructorRecentCourse,
} from "@/features/instructor-dashboard/types";
import { formatCompactNumber, formatCurrencyVND } from "@/lib/format";

const STATUS_CONFIG: Record<
  InstructorCourseStatus,
  {
    label: string;
    variant: "outline" | "warning" | "success" | "destructive" | "secondary";
  }
> = {
  draft: { label: "Bản nháp", variant: "outline" },
  pending_review: { label: "Chờ duyệt", variant: "warning" },
  changes_requested: { label: "Cần chỉnh sửa", variant: "warning" },
  published: { label: "Đã xuất bản", variant: "success" },
  rejected: { label: "Bị từ chối", variant: "destructive" },
  archived: { label: "Đã lưu trữ", variant: "secondary" },
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});

function CourseThumbnail({ course }: { course: InstructorRecentCourse }) {
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

export function RecentCourses({ courses }: { courses: InstructorRecentCourse[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Khóa học gần đây</CardTitle>
        <CardDescription>
          5 khóa học được cập nhật gần nhất cùng hiệu quả học tập và doanh thu.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {courses.length === 0 ? (
          <div className="border-border flex flex-col items-center rounded-xl border border-dashed px-6 py-12 text-center">
            <span className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <BookDashedIcon className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-medium">Chưa có khóa học</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
              Tạo khóa học đầu tiên để bắt đầu theo dõi học viên, doanh thu và tiến độ.
            </p>
            <Button
              className="mt-5"
              nativeButton={false}
              render={<Link href="/instructor/courses/new" />}
            >
              Tạo khóa học
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-4xl text-left">
              <caption className="sr-only">Danh sách 5 khóa học được cập nhật gần nhất</caption>
              <thead>
                <tr className="text-muted-foreground border-b text-xs">
                  <th className="pb-3 font-medium" scope="col">
                    Khóa học
                  </th>
                  <th className="pb-3 font-medium" scope="col">
                    Trạng thái
                  </th>
                  <th className="pb-3 text-right font-medium" scope="col">
                    Học viên
                  </th>
                  <th className="pb-3 font-medium" scope="col">
                    Hoàn thành
                  </th>
                  <th className="pb-3 text-right font-medium" scope="col">
                    Đánh giá
                  </th>
                  <th className="pb-3 text-right font-medium" scope="col">
                    Doanh thu
                  </th>
                  <th className="pb-3 text-right font-medium" scope="col">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => {
                  const status = STATUS_CONFIG[course.status];

                  return (
                    <tr className="border-b last:border-0" key={course.id}>
                      <th className="py-4 pr-5 font-normal" scope="row">
                        <div className="flex min-w-64 items-center gap-3">
                          <CourseThumbnail course={course} />
                          <div className="min-w-0">
                            <Link
                              href={`/instructor/courses/${course.id}/edit`}
                              className="hover:text-primary line-clamp-1 font-medium transition-colors"
                            >
                              {course.title}
                            </Link>
                            <span className="text-muted-foreground mt-0.5 block text-xs">
                              Cập nhật {DATE_FORMATTER.format(new Date(course.updatedAt))}
                            </span>
                          </div>
                        </div>
                      </th>
                      <td className="py-4 pr-5">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="py-4 pr-5 text-right font-medium tabular-nums">
                        {formatCompactNumber(course.studentsCount)}
                      </td>
                      <td className="w-40 py-4 pr-5">
                        <div className="flex items-center gap-2">
                          <Progress
                            className="min-w-20 flex-1"
                            value={course.completionRate}
                            aria-label={`Tỷ lệ hoàn thành ${course.completionRate}%`}
                          />
                          <span className="w-10 text-right text-xs font-medium tabular-nums">
                            {course.completionRate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-5 text-right">
                        {course.reviewCount > 0 && course.averageRating !== null ? (
                          <span className="inline-flex items-center justify-end gap-1 font-medium tabular-nums">
                            <StarIcon
                              className="fill-warning text-warning size-3.5"
                              aria-hidden="true"
                            />
                            {course.averageRating.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-4 pr-5 text-right font-medium whitespace-nowrap tabular-nums">
                        {formatCurrencyVND(course.revenue)}
                      </td>
                      <td className="py-4 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          nativeButton={false}
                          render={
                            <Link
                              href={`/instructor/courses/${course.id}/edit`}
                              aria-label={`Chỉnh sửa ${course.title}`}
                            />
                          }
                        >
                          <ArrowUpRightIcon aria-hidden="true" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
