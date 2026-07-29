"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { courseBuilderSchema, type CourseBuilderInput } from "@/features/course-builder/schemas";
import type {
  CourseMediaMutationInput,
  CourseMutationResult,
} from "@/features/course-builder/types";
import { isEditableCourseStatus, type CourseWorkflowStatus } from "@/types/course";

const SESSION_ERROR = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
const PERMISSION_ERROR = "Bạn không có quyền chỉnh sửa khoá học này.";

async function getInstructorContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: SESSION_ERROR } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "instructor") {
    return {
      ok: false,
      error: "Chỉ tài khoản giảng viên mới có thể quản lý khoá học.",
    } as const;
  }

  return { ok: true, supabase, user } as const;
}

function revalidateCourseBuilder(courseId: string) {
  revalidatePath("/instructor/dashboard");
  revalidatePath(`/instructor/courses/${courseId}/edit`);
}

export async function saveCourseDraft(
  courseId: string | null,
  input: CourseBuilderInput,
): Promise<CourseMutationResult> {
  const parsed = courseBuilderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu khoá học chưa hợp lệ. Vui lòng kiểm tra lại các trường." };
  }

  const context = await getInstructorContext();
  if (!context.ok) {
    return { error: context.error };
  }

  const { supabase, user } = context;
  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("slug", parsed.data.category)
    .eq("is_active", true)
    .maybeSingle();

  if (categoryError || !category) {
    return { error: "Danh mục không tồn tại hoặc đã bị tắt. Vui lòng chọn danh mục khác." };
  }

  const courseValues = {
    title: parsed.data.title.trim(),
    slug: parsed.data.slug.trim(),
    short_description: parsed.data.shortDescription.trim(),
    description: parsed.data.fullDescription.trim(),
    category: category.slug,
    category_id: category.id,
    level: parsed.data.level,
    language: parsed.data.language.trim(),
    price: parsed.data.price,
    sale_price: parsed.data.salePrice ?? null,
  };

  if (!courseId) {
    const { data, error } = await supabase
      .from("courses")
      .insert({
        ...courseValues,
        instructor_id: user.id,
        status: "draft",
        submitted_at: null,
      })
      .select("id")
      .single();

    if (error || !data) {
      return {
        error:
          error?.code === "23505"
            ? "Slug này đã được sử dụng. Vui lòng chọn slug khác."
            : "Không thể tạo bản nháp khoá học. Vui lòng thử lại.",
      };
    }

    revalidateCourseBuilder(data.id);
    return { data: { courseId: data.id, status: "draft" } };
  }

  const { data: currentCourse } = await supabase
    .from("courses")
    .select("id, status")
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (!currentCourse) {
    return { error: PERMISSION_ERROR };
  }

  const currentStatus = currentCourse.status as CourseWorkflowStatus;
  if (!isEditableCourseStatus(currentStatus)) {
    return {
      error: "Khóa học đang được kiểm duyệt hoặc đã xuất bản nên hiện chỉ có thể xem.",
    };
  }

  const { data, error } = await supabase
    .from("courses")
    .update(courseValues)
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return {
      error:
        error.code === "23505"
          ? "Slug này đã được sử dụng. Vui lòng chọn slug khác."
          : "Không thể lưu bản nháp khoá học. Vui lòng thử lại.",
    };
  }

  if (!data) {
    return { error: PERMISSION_ERROR };
  }

  revalidateCourseBuilder(courseId);
  return { data: { courseId, status: currentStatus } };
}

function isOwnedCourseMediaUrl(url: string, courseId: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const candidate = new URL(url);
    const projectUrl = new URL(supabaseUrl);
    const expectedPath = `/storage/v1/object/public/course-media/${courseId}/`;

    return candidate.origin === projectUrl.origin && candidate.pathname.startsWith(expectedPath);
  } catch {
    return false;
  }
}

export async function updateCourseMedia(
  courseId: string,
  input: CourseMediaMutationInput,
): Promise<CourseMutationResult> {
  const context = await getInstructorContext();
  if (!context.ok) {
    return { error: context.error };
  }

  const mediaValues: { thumbnail_url?: string; trailer_url?: string } = {};

  if (input.thumbnailUrl) {
    if (!isOwnedCourseMediaUrl(input.thumbnailUrl, courseId)) {
      return { error: "URL thumbnail không hợp lệ." };
    }
    mediaValues.thumbnail_url = input.thumbnailUrl;
  }

  if (input.trailerUrl) {
    if (!isOwnedCourseMediaUrl(input.trailerUrl, courseId)) {
      return { error: "URL trailer không hợp lệ." };
    }
    mediaValues.trailer_url = input.trailerUrl;
  }

  if (Object.keys(mediaValues).length === 0) {
    const { data } = await context.supabase
      .from("courses")
      .select("status")
      .eq("id", courseId)
      .eq("instructor_id", context.user.id)
      .maybeSingle();

    return data
      ? { data: { courseId, status: data.status as CourseWorkflowStatus } }
      : { error: PERMISSION_ERROR };
  }

  const { supabase, user } = context;
  const { data, error } = await supabase
    .from("courses")
    .update(mediaValues)
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    return { error: "Media đã được tải lên nhưng chưa thể liên kết với khoá học." };
  }

  if (!data) {
    return { error: PERMISSION_ERROR };
  }

  revalidateCourseBuilder(courseId);
  return { data: { courseId, status: data.status } };
}

export async function submitCourseForReview(courseId: string): Promise<CourseMutationResult> {
  const context = await getInstructorContext();
  if (!context.ok) {
    return { error: context.error };
  }

  const { supabase, user } = context;
  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select(
      "id, title, slug, short_description, description, category, level, language, thumbnail_url, trailer_url, price, sale_price, status",
    )
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .maybeSingle();

  if (courseError) {
    return { error: "Không thể kiểm tra khoá học trước khi gửi duyệt." };
  }

  if (!course) {
    return { error: PERMISSION_ERROR };
  }

  if (!isEditableCourseStatus(course.status as CourseWorkflowStatus)) {
    return { error: "Khóa học không thể gửi duyệt ở trạng thái hiện tại." };
  }

  const parsed = courseBuilderSchema.safeParse({
    title: course.title ?? "",
    slug: course.slug ?? "",
    shortDescription: course.short_description ?? "",
    fullDescription: course.description ?? "",
    category: course.category ?? "",
    level: course.level ?? "",
    language: course.language ?? "",
    thumbnailUrl: course.thumbnail_url ?? "",
    trailerUrl: course.trailer_url ?? "",
    price: Number(course.price ?? 0),
    salePrice: course.sale_price === null ? undefined : Number(course.sale_price),
  });

  if (!parsed.success) {
    return { error: "Khoá học chưa đủ thông tin hợp lệ để gửi duyệt." };
  }

  if (!course.thumbnail_url) {
    return { error: "Vui lòng tải thumbnail trước khi gửi duyệt." };
  }

  const { data, error } = await supabase
    .from("courses")
    .update({ status: "pending_review" })
    .eq("id", courseId)
    .eq("instructor_id", user.id)
    .in("status", ["draft", "changes_requested", "rejected"])
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: "Không thể gửi khoá học để duyệt. Vui lòng thử lại." };
  }

  if (!data) {
    return { error: PERMISSION_ERROR };
  }

  revalidateCourseBuilder(courseId);
  return { data: { courseId, status: "pending_review" } };
}
