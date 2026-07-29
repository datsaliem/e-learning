export interface AdminDashboardMetrics {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  totalEnrollments: number;
}

export interface AdminTrendPoint {
  period: string;
  value: number;
}

export interface BestSellingCourse {
  id: string;
  title: string;
  slug: string | null;
  thumbnailUrl: string | null;
  salesCount: number;
  revenue: number;
}

export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  revenueSeries: AdminTrendPoint[];
  newUserSeries: AdminTrendPoint[];
  bestSellingCourses: BestSellingCourse[];
}
