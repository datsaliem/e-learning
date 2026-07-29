import type { MetadataRoute } from "next";

import { PROTECTED_ROBOTS_PATHS, isSafeRobotsAllowPath } from "@/features/seo/constants";
import { getPublicSeoSettings } from "@/features/seo/queries";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

function uniquePaths(paths: readonly string[]): string[] {
  return [...new Set(paths.map((path) => path.trim()).filter(Boolean))];
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  const [settings, siteUrl] = await Promise.all([getPublicSeoSettings(), getSiteUrl()]);
  const indexingEnabled = settings.indexSite;
  const safeAllowPaths = uniquePaths(settings.robotsAllow).filter(isSafeRobotsAllowPath);
  const disallow = indexingEnabled
    ? uniquePaths([...PROTECTED_ROBOTS_PATHS, ...settings.robotsDisallow])
    : ["/"];

  return {
    rules: {
      userAgent: "*",
      ...(indexingEnabled && safeAllowPaths.length > 0 ? { allow: safeAllowPaths } : {}),
      disallow,
      ...(settings.crawlDelay ? { crawlDelay: settings.crawlDelay } : {}),
    },
    ...(indexingEnabled && settings.sitemapEnabled
      ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() }
      : {}),
    host: siteUrl.origin,
  };
}
