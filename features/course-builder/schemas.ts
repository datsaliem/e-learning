import { z } from "zod";

import {
  THUMBNAIL_ALLOWED_TYPES,
  THUMBNAIL_MAX_SIZE_BYTES,
  TRAILER_ALLOWED_TYPES,
  TRAILER_MAX_SIZE_BYTES,
  type CourseMediaKind,
} from "@/features/course-builder/constants";

const optionalPublicUrl = z.union([z.literal(""), z.url("URL media không hợp lệ")]);

export const courseBuilderSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Tiêu đề phải có ít nhất 5 ký tự")
      .max(120, "Tiêu đề tối đa 120 ký tự"),
    slug: z
      .string()
      .trim()
      .min(3, "Slug phải có ít nhất 3 ký tự")
      .max(140, "Slug tối đa 140 ký tự")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ gồm chữ thường, số và dấu gạch ngang"),
    shortDescription: z
      .string()
      .trim()
      .min(20, "Mô tả ngắn phải có ít nhất 20 ký tự")
      .max(220, "Mô tả ngắn tối đa 220 ký tự"),
    fullDescription: z
      .string()
      .trim()
      .min(100, "Mô tả đầy đủ phải có ít nhất 100 ký tự")
      .max(10000, "Mô tả đầy đủ tối đa 10.000 ký tự"),
    category: z
      .string()
      .trim()
      .min(2, "Vui lòng chọn danh mục")
      .max(100, "Danh mục không hợp lệ")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Danh mục không hợp lệ"),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    language: z.string().trim().min(2, "Vui lòng chọn ngôn ngữ").max(50),
    thumbnailUrl: optionalPublicUrl,
    trailerUrl: optionalPublicUrl,
    price: z
      .number({ error: "Giá phải là một số" })
      .int("Giá phải là số nguyên")
      .min(0, "Giá không được âm")
      .max(100000000, "Giá vượt quá giới hạn"),
    salePrice: z
      .number({ error: "Giá khuyến mãi phải là một số" })
      .int("Giá khuyến mãi phải là số nguyên")
      .min(0, "Giá khuyến mãi không được âm")
      .max(100000000, "Giá khuyến mãi vượt quá giới hạn")
      .optional(),
  })
  .superRefine((data, context) => {
    if (data.salePrice !== undefined && data.salePrice >= data.price) {
      context.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Giá khuyến mãi phải thấp hơn giá gốc",
      });
    }

    if (data.price === 0 && data.salePrice !== undefined) {
      context.addIssue({
        code: "custom",
        path: ["salePrice"],
        message: "Khoá học miễn phí không cần giá khuyến mãi",
      });
    }
  });

export type CourseBuilderInput = z.infer<typeof courseBuilderSchema>;

export function slugifyCourseTitle(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
}

export function validateCourseMediaFile(file: File, kind: CourseMediaKind): string | null {
  const allowedTypes = kind === "thumbnail" ? THUMBNAIL_ALLOWED_TYPES : TRAILER_ALLOWED_TYPES;
  const maxSize = kind === "thumbnail" ? THUMBNAIL_MAX_SIZE_BYTES : TRAILER_MAX_SIZE_BYTES;

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return kind === "thumbnail"
      ? "Thumbnail chỉ chấp nhận JPG, PNG hoặc WEBP."
      : "Trailer chỉ chấp nhận MP4, WEBM hoặc MOV.";
  }

  if (file.size > maxSize) {
    return kind === "thumbnail"
      ? "Thumbnail có kích thước tối đa 5MB."
      : "Trailer có kích thước tối đa 200MB.";
  }

  return null;
}
