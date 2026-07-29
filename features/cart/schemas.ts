import { z } from "zod";

export const cartCourseIdSchema = z
  .string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Mã khoá học không hợp lệ");

export const cartCourseIdsSchema = z.array(cartCourseIdSchema).max(50);
