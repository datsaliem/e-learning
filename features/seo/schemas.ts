import { z } from "zod";

import {
  PROTECTED_ROBOTS_PATHS,
  isProtectedSeoPath,
  isSafeRobotsAllowPath,
} from "@/features/seo/constants";
import { SEO_CHANGE_FREQUENCIES, SEO_CONTENT_TYPES } from "@/features/seo/types";

const publicUrlOrPath = z
  .string()
  .trim()
  .max(2048, "URL quá dài.")
  .refine((value) => {
    if (value === "") return true;
    if (/^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(value)) return true;

    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  }, "Chỉ chấp nhận đường dẫn bắt đầu bằng / hoặc URL HTTPS.");

function validateRobotsLines(value: string): boolean {
  const paths = splitRobotsPaths(value);
  return (
    paths.length <= 100 &&
    paths.every(
      (path) =>
        path.length <= 200 &&
        path.startsWith("/") &&
        !/\s/.test(path) &&
        /^[\x21-\x7e]+$/.test(path),
    )
  );
}

const robotsPathsField = z
  .string()
  .max(20100, "Danh sách robots quá dài.")
  .refine(
    validateRobotsLines,
    "Mỗi dòng phải là một đường dẫn bắt đầu bằng /, không chứa khoảng trắng (tối đa 100 dòng).",
  );

export const seoSettingsFormSchema = z
  .object({
    siteName: z.string().trim().min(2, "Tên website quá ngắn.").max(80, "Tên website quá dài."),
    siteDescription: z
      .string()
      .trim()
      .min(20, "Mô tả cần ít nhất 20 ký tự.")
      .max(300, "Mô tả tối đa 300 ký tự."),
    organizationName: z
      .string()
      .trim()
      .min(2, "Tên tổ chức quá ngắn.")
      .max(120, "Tên tổ chức quá dài."),
    organizationLogoUrl: publicUrlOrPath,
    defaultOgImageUrl: publicUrlOrPath.refine(
      (value) => value !== "",
      "Vui lòng nhập ảnh mặc định.",
    ),
    twitterHandle: z
      .string()
      .trim()
      .refine(
        (value) => value === "" || /^@[A-Za-z0-9_]{1,15}$/.test(value),
        "Twitter/X handle phải bắt đầu bằng @ và tối đa 15 ký tự.",
      ),
    indexSite: z.boolean(),
    followLinks: z.boolean(),
    sitemapEnabled: z.boolean(),
    crawlDelay: z
      .number({ error: "Crawl delay phải là số." })
      .int("Crawl delay phải là số nguyên.")
      .min(0, "Crawl delay không được âm.")
      .max(86400, "Crawl delay tối đa 86.400 giây."),
    robotsAllowText: robotsPathsField,
    robotsDisallowText: robotsPathsField,
  })
  .superRefine((value, context) => {
    if (splitRobotsPaths(value.robotsAllowText).some((path) => !isSafeRobotsAllowPath(path))) {
      context.addIssue({
        code: "custom",
        path: ["robotsAllowText"],
        message: "Allow không được mở lại route riêng tư hoặc dùng pattern bao phủ route riêng tư.",
      });
    }
  });

const cmsPath = z
  .string()
  .trim()
  .min(2, "Đường dẫn không hợp lệ.")
  .max(500, "Đường dẫn quá dài.")
  .regex(
    /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/?)+$/,
    "Dùng đường dẫn chữ thường, ví dụ /blog/hoc-nextjs.",
  )
  .refine(
    (path) => !isProtectedSeoPath(path),
    `Không thể index route riêng tư (${PROTECTED_ROBOTS_PATHS.slice(0, 4).join(", ")}…).`,
  );

export const seoSitemapEntryFormSchema = z.object({
  contentType: z.enum(SEO_CONTENT_TYPES),
  path: cmsPath,
  title: z.string().trim().min(2, "Tiêu đề quá ngắn.").max(160, "Tiêu đề tối đa 160 ký tự."),
  description: z.string().trim().max(300, "Mô tả tối đa 300 ký tự."),
  imageUrl: publicUrlOrPath,
  isPublished: z.boolean(),
  changeFrequency: z.enum(SEO_CHANGE_FREQUENCIES),
  priority: z
    .number({ error: "Priority phải là số." })
    .min(0, "Priority tối thiểu là 0.")
    .max(1, "Priority tối đa là 1."),
});

export type SeoSettingsFormInput = z.infer<typeof seoSettingsFormSchema>;
export type SeoSitemapEntryFormInput = z.infer<typeof seoSitemapEntryFormSchema>;

export function splitRobotsPaths(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    ),
  ];
}

export function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}
