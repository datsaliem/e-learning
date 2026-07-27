import { z } from "zod";

export const adminUserRoleSchema = z.enum(["student", "instructor", "admin"]);
export const adminUserStatusSchema = z.enum(["active", "blocked", "unverified"]);

const nullableText = z.string().nullable();
const nullableDate = z.string().nullable();

export const adminUserPageSchema = z.object({
  users: z.array(
    z.object({
      id: z.string().uuid(),
      email: z.string(),
      fullName: nullableText,
      avatarUrl: nullableText,
      phone: nullableText,
      headline: nullableText,
      bio: nullableText,
      website: nullableText,
      role: adminUserRoleSchema,
      status: adminUserStatusSchema,
      emailConfirmedAt: nullableDate,
      lastSignInAt: nullableDate,
      bannedUntil: nullableDate,
      createdAt: z.string(),
      enrollmentCount: z.coerce.number().int().nonnegative(),
      courseCount: z.coerce.number().int().nonnegative(),
    }),
  ),
  pagination: z.object({
    page: z.coerce.number().int().positive(),
    perPage: z.coerce.number().int().min(5).max(50),
    total: z.coerce.number().int().nonnegative(),
    totalPages: z.coerce.number().int().nonnegative(),
  }),
});

export const adminUserFiltersSchema = z.object({
  q: z.string().trim().max(100).default(""),
  role: z.union([z.literal("all"), adminUserRoleSchema]).default("all"),
  status: z.union([z.literal("all"), adminUserStatusSchema]).default("all"),
  page: z.coerce.number().int().positive().default(1),
});

const auditReasonSchema = z
  .string()
  .trim()
  .min(5, "Vui lòng nhập lý do ít nhất 5 ký tự.")
  .max(500, "Lý do không được vượt quá 500 ký tự.");

export const changeUserRoleSchema = z.object({
  userId: z.string().uuid("Người dùng không hợp lệ."),
  role: adminUserRoleSchema,
  reason: auditReasonSchema,
});

export const setUserBlockedSchema = z.object({
  userId: z.string().uuid("Người dùng không hợp lệ."),
  blocked: z.boolean(),
  reason: auditReasonSchema,
});

export const adminUserMutationResultSchema = z.union([
  z.object({
    data: z
      .object({
        userId: z.string().uuid(),
        role: adminUserRoleSchema.optional(),
        status: adminUserStatusSchema.optional(),
      })
      .refine((value) => Boolean(value.role || value.status)),
  }),
  z.object({
    error: z.string().min(1),
  }),
]);

export type ChangeUserRoleInput = z.infer<typeof changeUserRoleSchema>;
export type SetUserBlockedInput = z.infer<typeof setUserBlockedSchema>;
