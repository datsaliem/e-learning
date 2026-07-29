import type { MetadataRoute } from "next";

import { getCourseCatalog } from "@/features/courses/services";
import { STATIC_SITEMAP_ROUTES, isProtectedSeoPath } from "@/features/seo/constants";
import { getPublicSeoSettings, getPublishedSitemapEntries } from "@/features/seo/queries";
import { absoluteSiteUrl, getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function validDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, siteUrl, courses, cmsEntries] = await Promise.all([
    getPublicSeoSettings(),
    getSiteUrl(),
    getCourseCatalog(),
    getPublishedSitemapEntries(),
  ]);

  if (!settings.indexSite || !settings.sitemapEnabled) return [];

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const route of STATIC_SITEMAP_ROUTES) {
    const url = absoluteSiteUrl(route.path, siteUrl);
    entries.set(url, {
      url,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    });
  }

  for (const course of courses) {
    const url = absoluteSiteUrl(`/courses/${course.slug}`, siteUrl);
    entries.set(url, {
      url,
      lastModified: validDate(course.publishedAt),
      changeFrequency: "weekly",
      priority: 0.8,
      ...(course.thumbnailUrl ? { images: [absoluteSiteUrl(course.thumbnailUrl, siteUrl)] } : {}),
    });
  }

  for (const entry of cmsEntries) {
    if (!entry.isPublished || isProtectedSeoPath(entry.path)) continue;
    const url = absoluteSiteUrl(entry.path, siteUrl);
    if (entries.has(url)) continue;

    entries.set(url, {
      url,
      lastModified: validDate(entry.updatedAt),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
      ...(entry.imageUrl ? { images: [absoluteSiteUrl(entry.imageUrl, siteUrl)] } : {}),
    });
  }

  return [...entries.values()];
}
