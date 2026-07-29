import Link from "next/link";
import {
  BarChart3Icon,
  BookOpenIcon,
  CircleCheckBigIcon,
  LineChartIcon,
  PlusIcon,
  StarIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/shared/dashboard-metric-card";
import { TrendChart } from "@/components/shared/trend-chart";
import { RecentCourses } from "@/features/instructor-dashboard/components/recent-courses";
import type { InstructorDashboardData } from "@/features/instructor-dashboard/types";
import { formatCompactNumber, formatCurrencyVND } from "@/lib/format";

const COMPACT_FORMATTER = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatChartNumber(value: number): string {
  return COMPACT_FORMATTER.format(Math.round(value));
}

function formatChartCurrency(value: number): string {
  return `${COMPACT_FORMATTER.format(Math.round(value))}đ`;
}

function firstName(fullName: string): string {
  const names = fullName.trim().split(/\s+/);
  return names.at(-1) || "Giảng viên";
}

export function InstructorDashboard({
  data,
  instructorName,
}: {
  data: InstructorDashboardData;
  instructorName: string;
}) {
  const { metrics } = data;
  const periodEnrollments = data.enrollmentSeries.reduce((sum, point) => sum + point.value, 0);
  const periodRevenue = data.revenueSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="bg-muted/25 flex-1">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Badge variant="secondary">Không gian giảng viên</Badge>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              Chào {firstName(instructorName)}, đây là lớp học của bạn
            </h1>
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
              Theo dõi hiệu quả khóa học, mức độ tham gia và doanh thu trong một nơi.
            </p>
          </div>
          <Button size="lg" nativeButton={false} render={<Link href="/instructor/courses/new" />}>
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Tạo khóa học
          </Button>
        </header>

        <section aria-labelledby="dashboard-metrics-heading">
          <h2 id="dashboard-metrics-heading" className="sr-only">
            Chỉ số tổng quan
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <MetricCard
              label="Tổng khóa học"
              value={formatCompactNumber(metrics.totalCourses)}
              description="Tất cả trạng thái"
              icon={BookOpenIcon}
              tone="primary"
            />
            <MetricCard
              label="Tổng học viên"
              value={formatCompactNumber(metrics.totalStudents)}
              description={`${formatCompactNumber(metrics.totalEnrollments)} lượt ghi danh`}
              icon={UsersIcon}
              tone="secondary"
            />
            <MetricCard
              label="Doanh thu"
              value={formatCurrencyVND(metrics.totalRevenue)}
              description="Đơn đã thanh toán"
              icon={WalletCardsIcon}
              tone="success"
            />
            <MetricCard
              label="Đánh giá trung bình"
              value={
                metrics.reviewCount > 0 && metrics.averageRating !== null
                  ? `${metrics.averageRating.toFixed(1)}/5`
                  : "—"
              }
              description={
                metrics.reviewCount > 0
                  ? `${formatCompactNumber(metrics.reviewCount)} đánh giá`
                  : "Chưa có đánh giá"
              }
              icon={StarIcon}
              tone="warning"
            />
            <MetricCard
              label="Tỷ lệ hoàn thành"
              value={`${metrics.completionRate}%`}
              description="Trên tổng lượt ghi danh"
              icon={CircleCheckBigIcon}
              tone="muted"
            />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2" aria-label="Biểu đồ 12 tháng gần nhất">
          <TrendChart
            id="enrollment-trend"
            title="Lượt ghi danh"
            description="Số lượt ghi danh theo tháng trong 12 tháng gần nhất."
            summary={formatCompactNumber(periodEnrollments)}
            data={data.enrollmentSeries}
            icon={LineChartIcon}
            kind="area"
            valueLabel="Lượt ghi danh"
            formatValue={formatChartNumber}
          />
          <TrendChart
            id="revenue-trend"
            title="Doanh thu"
            description="Doanh thu từ các thanh toán thành công theo tháng."
            summary={formatCurrencyVND(periodRevenue)}
            data={data.revenueSeries}
            icon={BarChart3Icon}
            kind="bar"
            valueLabel="Doanh thu"
            formatValue={formatChartCurrency}
          />
        </section>

        <RecentCourses courses={data.recentCourses} />
      </div>
    </div>
  );
}
