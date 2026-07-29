export const SEO_CONTENT_TYPES = ["blog", "product", "page"] as const;
export const SEO_CHANGE_FREQUENCIES = [
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
] as const;

export type SeoContentType = (typeof SEO_CONTENT_TYPES)[number];
export type SeoChangeFrequency = (typeof SEO_CHANGE_FREQUENCIES)[number];

export interface SeoSettings {
  siteName: string;
  siteDescription: string;
  organizationName: string;
  organizationLogoUrl: string | null;
  defaultOgImageUrl: string;
  twitterHandle: string | null;
  indexSite: boolean;
  followLinks: boolean;
  sitemapEnabled: boolean;
  crawlDelay: number | null;
  robotsAllow: string[];
  robotsDisallow: string[];
  updatedAt: string | null;
}

export interface SeoSitemapEntry {
  id: string;
  contentType: SeoContentType;
  path: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  isPublished: boolean;
  changeFrequency: SeoChangeFrequency;
  priority: number;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminSeoData {
  settings: SeoSettings;
  entries: SeoSitemapEntry[];
}
