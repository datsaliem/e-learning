import "server-only";

import { headers } from "next/headers";

function normalizeBaseUrl(url: URL): URL {
  const normalized = new URL(url.origin);
  normalized.pathname = "/";
  return normalized;
}

function configuredSiteUrl(): URL | null {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return null;

  try {
    return normalizeBaseUrl(new URL(configured));
  } catch {
    return null;
  }
}

export async function getSiteUrl(): Promise<URL> {
  const configured = configuredSiteUrl();
  if (configured && !["localhost", "127.0.0.1"].includes(configured.hostname)) {
    return configured;
  }

  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" ? "http" : "https";

  if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host)) {
    return normalizeBaseUrl(new URL(`${protocol}://${host}`));
  }

  return configured ?? new URL("http://localhost:3000");
}

export function absoluteSiteUrl(pathOrUrl: string, siteUrl: URL): string {
  try {
    return new URL(pathOrUrl, siteUrl).toString();
  } catch {
    return new URL("/", siteUrl).toString();
  }
}
