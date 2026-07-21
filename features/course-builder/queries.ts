import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { OwnedCourseDraft } from "@/features/course-builder/types";

export async function getOwnedCourseDraft(
  courseId: string,
  instructorId: string,
): Promise<OwnedCourseDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      "id, title, slug, short_description, description, category, level, language, thumbnail_url, trailer_url, price, sale_price, status, submitted_at",
    )
    .eq("id", courseId)
    .eq("instructor_id", instructorId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    title: data.title ?? "",
    slug: data.slug ?? "",
    shortDescription: data.short_description ?? "",
    fullDescription: data.description ?? "",
    category: data.category ?? "lap-trinh",
    level: data.level ?? "beginner",
    language: data.language ?? "Tiếng Việt",
    thumbnailUrl: data.thumbnail_url ?? "",
    trailerUrl: data.trailer_url ?? "",
    price: Number(data.price ?? 0),
    salePrice: data.sale_price === null ? undefined : Number(data.sale_price),
    status: data.status,
    submittedAt: data.submitted_at,
  } as OwnedCourseDraft;
}
