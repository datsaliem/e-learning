import {
  BarChart3Icon,
  BookOpenIcon,
  GraduationCapIcon,
  ReceiptTextIcon,
  SchoolIcon,
  UserRoundCheckIcon,
  UsersIcon,
  WalletCardsIcon,
} from "lucide-react";

import { MetricCard } from "@/components/shared/dashboard-metric-card";
import { TrendChart } from "@/components/shared/trend-chart";
import { Badge } from "@/components/ui/badge";
import { BestSellingCourses } from "@/features/admin-dashboard/components/best-selling-courses";
import type { AdminDashboardData } from "@/features/admin-dashboard/types";
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

export function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const { metrics } = data;
  const periodRevenue = data.revenueSeries.reduce((sum, point) => sum + point.value, 0);
  const periodUsers = data.newUserSeries.reduce((sum, point) => sum + point.value, 0);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
      <header>
        <Badge variant="secondary">Toàn hệ thống</Badge>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          Bảng điều khiển quản trị
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm sm:text-base">
          Theo dõi tăng trưởng người dùng, hoạt động học tập và hiệu quả kinh doanh.
        </p>
      </header>

      <section id="users" className="scroll-mt-36" aria-labelledby="admin-users-heading">
        <div className="mb-3">
          <h2 id="admin-users-heading" className="font-semibold">
            Người dùng
          </h2>
          <p className="text-muted-foreground text-sm">Quy mô cộng đồng trên nền tảng.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard
            label="Tổng người dùng"
            value={formatCompactNumber(metrics.totalUsers)}
            description="Bao gồm mọi vai trò"
            icon={UsersIcon}
            tone="primary"
          />
          <MetricCard
            label="Học viên"
            value={formatCompactNumber(metrics.totalStudents)}
            description="Tài khoản có vai trò student"
            icon={GraduationCapIcon}
            tone="secondary"
          />
          <MetricCard
            label="Giảng viên"
            value={formatCompactNumber(metrics.totalInstructors)}
            description="Tài khoản có vai trò instructor"
            icon={SchoolIcon}
            tone="success"
          />
        </div>
      </section>

      <section id="courses" className="scroll-mt-36" aria-labelledby="admin-platform-heading">
        <div className="mb-3">
          <h2 id="admin-platform-heading" className="font-semibold">
            Nội dung và kinh doanh
          </h2>
          <p className="text-muted-foreground text-sm">
            Khóa học, đơn hàng, doanh thu và hoạt động ghi danh.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Tổng khóa học"
            value={formatCompactNumber(metrics.totalCourses)}
            description={`${formatCompactNumber(metrics.publishedCourses)} đã xuất bản`}
            icon={BookOpenIcon}
            tone="primary"
          />
          <div id="orders" className="scroll-mt-36">
            <MetricCard
              label="Đơn hàng"
              value={formatCompactNumber(metrics.totalOrders)}
              description={`${formatCompactNumber(metrics.paidOrders)} đã thanh toán`}
              icon={ReceiptTextIcon}
              tone="warning"
            />
          </div>
          <MetricCard
            label="Doanh thu"
            value={formatCurrencyVND(metrics.totalRevenue)}
            description="Từ đơn hàng đã thanh toán"
            icon={WalletCardsIcon}
            tone="success"
          />
          <MetricCard
            label="Lượt ghi danh"
            value={formatCompactNumber(metrics.totalEnrollments)}
            description="Tổng enrollment toàn hệ thống"
            icon={UserRoundCheckIcon}
            tone="muted"
          />
        </div>
      </section>

      <section
        id="analytics"
        className="grid scroll-mt-36 gap-4 xl:grid-cols-2"
        aria-label="Biểu đồ tăng trưởng 12 tháng gần nhất"
      >
        <TrendChart
          id="admin-revenue-trend"
          title="Doanh thu"
          description="Doanh thu từ các đơn đã thanh toán theo tháng."
          summary={formatCurrencyVND(periodRevenue)}
          data={data.revenueSeries}
          icon={BarChart3Icon}
          kind="bar"
          valueLabel="Doanh thu"
          formatValue={formatChartCurrency}
        />
        <TrendChart
          id="admin-user-trend"
          title="Người dùng mới"
          description="Số tài khoản được tạo mới theo tháng."
          summary={formatCompactNumber(periodUsers)}
          data={data.newUserSeries}
          icon={UsersIcon}
          kind="area"
          valueLabel="Người dùng mới"
          formatValue={formatChartNumber}
        />
      </section>

      <BestSellingCourses courses={data.bestSellingCourses} />
    </div>
  );
}
