import type { SeoSettings } from "@/features/seo/types";

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteName: "E-Learning",
  siteDescription:
    "Học kỹ năng mới, tiến xa hơn trong sự nghiệp với các khóa học trực tuyến chất lượng.",
  organizationName: "E-Learning",
  organizationLogoUrl: null,
  defaultOgImageUrl: "/og.png",
  twitterHandle: null,
  indexSite: true,
  followLinks: true,
  sitemapEnabled: true,
  crawlDelay: null,
  robotsAllow: ["/"],
  robotsDisallow: [],
  updatedAt: null,
};

/**
 * Đây là rào chắn SEO, không phải cơ chế phân quyền. Các route này vẫn phải
 * được bảo vệ bằng Auth/RLS; CMS không thể xóa chúng khỏi robots.txt.
 */
export const PROTECTED_ROBOTS_PATHS = [
  "/admin",
  "/dashboard",
  "/checkout",
  "/learn",
  "/instructor",
  "/my-courses",
  "/profile",
  "/settings",
  "/cart",
  "/auth",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/check-email",
  "/api",
] as const;

export const STATIC_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/courses", changeFrequency: "daily", priority: 0.9 },
  { path: "/instructors/apply", changeFrequency: "monthly", priority: 0.6 },
  { path: "/certificates/verify", changeFrequency: "monthly", priority: 0.4 },
  { path: "/help", changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.4 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.5 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/refund-policy", changeFrequency: "yearly", priority: 0.3 },
] as const;

export const SEO_CONTENT_TYPE_LABELS = {
  blog: "Bài viết",
  product: "Sản phẩm",
  page: "Trang",
} as const;

export const SEO_CHANGE_FREQUENCY_LABELS = {
  always: "Luôn thay đổi",
  hourly: "Hàng giờ",
  daily: "Hàng ngày",
  weekly: "Hàng tuần",
  monthly: "Hàng tháng",
  yearly: "Hàng năm",
  never: "Không đổi",
} as const;

export function isProtectedSeoPath(path: string): boolean {
  const normalized = path.endsWith("/") ? path : `${path}/`;
  return PROTECTED_ROBOTS_PATHS.some((protectedPath) => {
    const protectedNormalized = protectedPath.endsWith("/") ? protectedPath : `${protectedPath}/`;
    return normalized === protectedNormalized || normalized.startsWith(protectedNormalized);
  });
}

export function isSafeRobotsAllowPath(rule: string): boolean {
  if (rule === "/") return true;

  const firstPatternCharacter = rule.search(/[*$?]/);
  const literalPrefix = firstPatternCharacter === -1 ? rule : rule.slice(0, firstPatternCharacter);

  return !PROTECTED_ROBOTS_PATHS.some((protectedPath) => {
    if (
      literalPrefix === protectedPath ||
      literalPrefix.startsWith(`${protectedPath}/`) ||
      literalPrefix.startsWith(`${protectedPath}?`)
    ) {
      return true;
    }

    return firstPatternCharacter !== -1 && protectedPath.startsWith(literalPrefix);
  });
}
