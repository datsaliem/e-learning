import { z } from "zod";

const nonNegativeNumber = z.coerce.number().finite().nonnegative();

const trendPointSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: nonNegativeNumber,
});

export const adminDashboardSchema = z.object({
  metrics: z.object({
    totalUsers: nonNegativeNumber,
    totalStudents: nonNegativeNumber,
    totalInstructors: nonNegativeNumber,
    totalCourses: nonNegativeNumber,
    publishedCourses: nonNegativeNumber,
    totalOrders: nonNegativeNumber,
    paidOrders: nonNegativeNumber,
    totalRevenue: nonNegativeNumber,
    totalEnrollments: nonNegativeNumber,
  }),
  revenueSeries: z.array(trendPointSchema).length(12),
  newUserSeries: z.array(trendPointSchema).length(12),
  bestSellingCourses: z
    .array(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1),
        slug: z.string().nullable(),
        thumbnailUrl: z.string().nullable(),
        salesCount: nonNegativeNumber,
        revenue: nonNegativeNumber,
      }),
    )
    .max(5),
});
