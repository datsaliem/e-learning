import "server-only";

import { cache } from "react";
import { z } from "zod";

import { DEFAULT_SEO_SETTINGS } from "@/features/seo/constants";
import {
  SEO_CHANGE_FREQUENCIES,
  SEO_CONTENT_TYPES,
  type AdminSeoData,
  type SeoSettings,
  type SeoSitemapEntry,
} from "@/features/seo/types";
import { createClient } from "@/lib/supabase/server";

const seoSettingsRowSchema = z.object({
  site_name: z.string(),
  site_description: z.string(),
  organization_name: z.string(),
  organization_logo_url: z.string().nullable(),
  default_og_image_url: z.string(),
  twitter_handle: z.string().nullable(),
  index_site: z.boolean(),
  follow_links: z.boolean(),
  sitemap_enabled: z.boolean(),
  crawl_delay: z.coerce.number().int().nullable(),
  robots_allow: z.array(z.string()),
  robots_disallow: z.array(z.string()),
  updated_at: z.string(),
});

const seoSitemapEntryRowSchema = z.object({
  id: z.string().uuid(),
  content_type: z.enum(SEO_CONTENT_TYPES),
  path: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  image_url: z.string().nullable(),
  is_published: z.boolean(),
  change_frequency: z.enum(SEO_CHANGE_FREQUENCIES),
  priority: z.coerce.number().min(0).max(1),
  published_at: z.string().nullable(),
  updated_at: z.string(),
});

function mapSettings(row: z.infer<typeof seoSettingsRowSchema>): SeoSettings {
  return {
    siteName: row.site_name,
    siteDescription: row.site_description,
    organizationName: row.organization_name,
    organizationLogoUrl: row.organization_logo_url,
    defaultOgImageUrl: row.default_og_image_url,
    twitterHandle: row.twitter_handle,
    indexSite: row.index_site,
    followLinks: row.follow_links,
    sitemapEnabled: row.sitemap_enabled,
    crawlDelay: row.crawl_delay,
    robotsAllow: row.robots_allow,
    robotsDisallow: row.robots_disallow,
    updatedAt: row.updated_at,
  };
}

function mapEntry(row: z.infer<typeof seoSitemapEntryRowSchema>): SeoSitemapEntry {
  return {
    id: row.id,
    contentType: row.content_type,
    path: row.path,
    title: row.title,
    description: row.description,
    imageUrl: row.image_url,
    isPublished: row.is_published,
    changeFrequency: row.change_frequency,
    priority: row.priority,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

async function readPublicSeoSettings(): Promise<SeoSettings> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_settings")
      .select(
        "site_name, site_description, organization_name, organization_logo_url, default_og_image_url, twitter_handle, index_site, follow_links, sitemap_enabled, crawl_delay, robots_allow, robots_disallow, updated_at",
      )
      .eq("id", true)
      .maybeSingle();

    if (error || !data) return DEFAULT_SEO_SETTINGS;
    const parsed = seoSettingsRowSchema.safeParse(data);
    return parsed.success ? mapSettings(parsed.data) : DEFAULT_SEO_SETTINGS;
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
}

export const getPublicSeoSettings = cache(readPublicSeoSettings);

export async function getPublishedSitemapEntries(): Promise<SeoSitemapEntry[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("seo_sitemap_entries")
      .select(
        "id, content_type, path, title, description, image_url, is_published, change_frequency, priority, published_at, updated_at",
      )
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    if (error) return [];
    const parsed = z.array(seoSitemapEntryRowSchema).safeParse(data ?? []);
    return parsed.success ? parsed.data.map(mapEntry) : [];
  } catch {
    return [];
  }
}

export async function getAdminSeoData(): Promise<AdminSeoData> {
  const supabase = await createClient();
  const [settingsResult, entriesResult] = await Promise.all([
    supabase
      .from("seo_settings")
      .select(
        "site_name, site_description, organization_name, organization_logo_url, default_og_image_url, twitter_handle, index_site, follow_links, sitemap_enabled, crawl_delay, robots_allow, robots_disallow, updated_at",
      )
      .eq("id", true)
      .maybeSingle(),
    supabase
      .from("seo_sitemap_entries")
      .select(
        "id, content_type, path, title, description, image_url, is_published, change_frequency, priority, published_at, updated_at",
      )
      .order("updated_at", { ascending: false }),
  ]);

  if (settingsResult.error || entriesResult.error) {
    throw new Error("Không thể tải cấu hình SEO. Vui lòng kiểm tra migration database.");
  }

  const parsedSettings = seoSettingsRowSchema.safeParse(settingsResult.data);
  const parsedEntries = z.array(seoSitemapEntryRowSchema).safeParse(entriesResult.data ?? []);
  if (!parsedSettings.success || !parsedEntries.success) {
    throw new Error("Dữ liệu SEO không đúng định dạng.");
  }

  return {
    settings: mapSettings(parsedSettings.data),
    entries: parsedEntries.data.map(mapEntry),
  };
}
