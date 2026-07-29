"use server";

import { revalidatePath } from "next/cache";

import {
  nullableText,
  seoSettingsFormSchema,
  seoSitemapEntryFormSchema,
  splitRobotsPaths,
  type SeoSettingsFormInput,
  type SeoSitemapEntryFormInput,
} from "@/features/seo/schemas";
import { createClient } from "@/lib/supabase/server";

interface SeoActionResult {
  data?: { id: string };
  error?: string;
}

async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Phiên đăng nhập đã hết hạn." } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { ok: false, error: "Chỉ quản trị viên mới được thay đổi SEO." } as const;
  }

  return { ok: true, supabase } as const;
}

function refreshSeoRoutes() {
  revalidatePath("/");
  revalidatePath("/robots.txt");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/seo");
}

function seoDatabaseError(error: { code?: string; details?: string | null }): string {
  if (error.code === "23505") {
    return "Đường dẫn này đã có trong sitemap.";
  }
  if (error.code === "23514") {
    return "Database từ chối dữ liệu SEO không hợp lệ.";
  }
  return "Không thể lưu cấu hình SEO. Vui lòng thử lại.";
}

export async function saveSeoSettings(values: SeoSettingsFormInput): Promise<SeoActionResult> {
  const parsed = seoSettingsFormSchema.safeParse(values);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Cấu hình SEO không hợp lệ." };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const { data, error } = await context.supabase
    .from("seo_settings")
    .update({
      site_name: parsed.data.siteName.trim(),
      site_description: parsed.data.siteDescription.trim(),
      organization_name: parsed.data.organizationName.trim(),
      organization_logo_url: nullableText(parsed.data.organizationLogoUrl),
      default_og_image_url: parsed.data.defaultOgImageUrl.trim(),
      twitter_handle: nullableText(parsed.data.twitterHandle),
      index_site: parsed.data.indexSite,
      follow_links: parsed.data.followLinks,
      sitemap_enabled: parsed.data.sitemapEnabled,
      crawl_delay: parsed.data.crawlDelay === 0 ? null : parsed.data.crawlDelay,
      robots_allow: splitRobotsPaths(parsed.data.robotsAllowText),
      robots_disallow: splitRobotsPaths(parsed.data.robotsDisallowText),
    })
    .eq("id", true)
    .select("id")
    .maybeSingle();

  if (error) return { error: seoDatabaseError(error) };
  if (!data) return { error: "Không tìm thấy cấu hình SEO mặc định." };

  refreshSeoRoutes();
  return { data: { id: String(data.id) } };
}

export async function saveSeoSitemapEntry(
  entryId: string | null,
  values: SeoSitemapEntryFormInput,
): Promise<SeoActionResult> {
  const parsedId =
    entryId === null
      ? { success: true as const, data: null }
      : /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)
        ? { success: true as const, data: entryId }
        : { success: false as const };
  const parsed = seoSitemapEntryFormSchema.safeParse(values);

  if (!parsedId.success || !parsed.success) {
    return {
      error: parsed.success
        ? "Mục sitemap không hợp lệ."
        : (parsed.error.issues[0]?.message ?? "Mục sitemap không hợp lệ."),
    };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const valuesToWrite = {
    content_type: parsed.data.contentType,
    path: parsed.data.path.trim(),
    title: parsed.data.title.trim(),
    description: nullableText(parsed.data.description),
    image_url: nullableText(parsed.data.imageUrl),
    is_published: parsed.data.isPublished,
    change_frequency: parsed.data.changeFrequency,
    priority: parsed.data.priority,
  };

  const query = parsedId.data
    ? context.supabase.from("seo_sitemap_entries").update(valuesToWrite).eq("id", parsedId.data)
    : context.supabase.from("seo_sitemap_entries").insert(valuesToWrite);
  const { data, error } = await query.select("id").maybeSingle();

  if (error) return { error: seoDatabaseError(error) };
  if (!data) return { error: "Mục sitemap không tồn tại hoặc bạn không có quyền chỉnh sửa." };

  refreshSeoRoutes();
  return { data: { id: data.id } };
}

export async function deleteSeoSitemapEntry(entryId: string): Promise<SeoActionResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entryId)) {
    return { error: "Mục sitemap không hợp lệ." };
  }

  const context = await getAdminContext();
  if (!context.ok) return { error: context.error };

  const { data, error } = await context.supabase
    .from("seo_sitemap_entries")
    .delete()
    .eq("id", entryId)
    .select("id")
    .maybeSingle();

  if (error) return { error: seoDatabaseError(error) };
  if (!data) return { error: "Mục sitemap không tồn tại hoặc đã bị xóa." };

  refreshSeoRoutes();
  return { data: { id: data.id } };
}
