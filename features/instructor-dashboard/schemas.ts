import { z } from "zod";

const nonNegativeNumber = z.coerce.number().finite().nonnegative();
const percentage = nonNegativeNumber.max(100);
const rating = z.coerce.number().min(1).max(5).nullable();

const trendPointSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: nonNegativeNumber,
});

const recentCourseSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  slug: z.string().nullable(),
  status: z.enum([
    "draft",
    "pending_review",
    "changes_requested",
    "published",
    "rejected",
    "archived",
  ]),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  studentsCount: nonNegativeNumber,
  revenue: nonNegativeNumber,
  averageRating: rating,
  reviewCount: nonNegativeNumber,
  completionRate: percentage,
});

export const instructorDashboardSchema = z.object({
  metrics: z.object({
    totalCourses: nonNegativeNumber,
    totalStudents: nonNegativeNumber,
    totalEnrollments: nonNegativeNumber,
    totalRevenue: nonNegativeNumber,
    averageRating: rating,
    reviewCount: nonNegativeNumber,
    completionRate: percentage,
  }),
  enrollmentSeries: z.array(trendPointSchema).length(12),
  revenueSeries: z.array(trendPointSchema).length(12),
  recentCourses: z.array(recentCourseSchema).max(5),
});
