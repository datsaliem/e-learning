export type InstructorCourseStatus =
  "draft" | "pending_review" | "changes_requested" | "published" | "rejected" | "archived";

export interface InstructorDashboardMetrics {
  totalCourses: number;
  totalStudents: number;
  totalEnrollments: number;
  totalRevenue: number;
  averageRating: number | null;
  reviewCount: number;
  completionRate: number;
}

export interface InstructorTrendPoint {
  period: string;
  value: number;
}

export interface InstructorRecentCourse {
  id: string;
  title: string;
  slug: string | null;
  status: InstructorCourseStatus;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  studentsCount: number;
  revenue: number;
  averageRating: number | null;
  reviewCount: number;
  completionRate: number;
}

export interface InstructorDashboardData {
  metrics: InstructorDashboardMetrics;
  enrollmentSeries: InstructorTrendPoint[];
  revenueSeries: InstructorTrendPoint[];
  recentCourses: InstructorRecentCourse[];
}
