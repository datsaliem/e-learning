import { z } from "zod";

/**
 * Schema chỉ VALIDATE, không transform — input và output giữ nguyên kiểu
 * string cho mọi field. Lý do: zod .transform()/.preprocess() làm output
 * type khác input type, khiến zodResolver + FormField (generic 3 tham số
 * TFieldValues/TContext/TTransformedValues của react-hook-form) vỡ type
 * theo nhiều cách khó kiểm soát khi dùng component Form tự viết. Việc
 * chuẩn hoá dữ liệu (chuỗi rỗng -> null, tự thêm https://...) chuyển thành
 * các hàm normalize* riêng, áp dụng ở server action trước khi ghi DB.
 */
const phoneField = z
  .string()
  .trim()
  .refine((val) => val === "" || /^[+()\-\s\d]{6,20}$/.test(val), "Số điện thoại không hợp lệ");

const headlineField = z.string().trim().max(120, "Chức danh tối đa 120 ký tự");

const bioField = z.string().trim().max(500, "Giới thiệu tối đa 500 ký tự");

function withHttps(val: string): string {
  return /^https?:\/\//i.test(val) ? val : `https://${val}`;
}

const websiteField = z
  .string()
  .trim()
  .max(2048, "Website quá dài")
  .refine((val) => {
    if (val === "") return true;
    try {
      new URL(withHttps(val));
      return true;
    } catch {
      return false;
    }
  }, "Website không hợp lệ");

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên phải có ít nhất 2 ký tự").max(100, "Họ tên quá dài"),
  phone: phoneField,
  headline: headlineField,
  bio: bioField,
  website: websiteField,
});

/** Input và output giống hệt nhau (chỉ validate, không transform) nên chỉ cần một kiểu duy nhất. */
export type ProfileInput = z.infer<typeof profileSchema>;
export type ProfileFormValues = ProfileInput;

/** Chuẩn hoá giá trị đã qua validate thành dữ liệu ghi DB — chuỗi rỗng -> null. */
export function normalizeOptionalText(val: string): string | null {
  const trimmed = val.trim();
  return trimmed === "" ? null : trimmed;
}

export function normalizeWebsite(val: string): string | null {
  const trimmed = val.trim();
  return trimmed === "" ? null : withHttps(trimmed);
}

/** Dùng ở cả client (kiểm tra trước khi upload) lẫn khai báo bucket phía server. */
export const AVATAR_MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
export const AVATAR_ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export function validateAvatarFile(file: File): string | null {
  if (!AVATAR_ALLOWED_TYPES.includes(file.type as (typeof AVATAR_ALLOWED_TYPES)[number])) {
    return "Chỉ chấp nhận ảnh định dạng JPG, PNG hoặc WEBP.";
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return "Kích thước ảnh tối đa 2MB.";
  }
  return null;
}
