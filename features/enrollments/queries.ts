import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/features/auth/queries";
import { getCourseById } from "@/features/courses/services";
import type { EnrollmentStatus, MyCourseEnrollment } from "@/features/enrollments/types";

/**
 * Kiểm tra user hiện tại đã ghi danh khoá học chưa — truy vấn thật vào
 * bảng public.enrollments (xem supabase/migrations). Course trong dự án
 * hiện là mock data (id dạng "course-1", không phải uuid), nên khi chưa
 * nối Supabase thật hoặc chưa có khoá học thật trong DB, hàm này sẽ luôn
 * trả về false một cách an toàn thay vì lỗi — không chặn người dùng xem
 * trang.
 */
export async function getEnrollmentStatus(courseId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) {
    return false;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("enrollments")
      .select("id")
      .eq("course_id", courseId)
      .eq("student_id", user.id)
      .maybeSingle();

    return !!data;
  } catch {
    return false;
  }
}

/**
 * Danh sách khoá học đã ghi danh của user hiện tại, ghép từ 2 bảng thật
 * (enrollments, lesson_progress) và làm giàu thông tin hiển thị (tiêu đề,
 * giảng viên, tổng số bài học...) từ catalog khoá học (hiện là mock — xem
 * ghi chú ở features/courses/services.ts). Enrollment nào tham chiếu
 * course_id không có trong catalog sẽ bị bỏ qua vì không đủ dữ liệu để
 * hiển thị thẻ khoá học.
 */
export async function getMyCourses(): Promise<MyCourseEnrollment[]> {
  const user = await getCurrentUser();
  if (!user) {
    return [];
  }

  try {
    const supabase = await createClient();

    const [{ data: enrollments }, { data: progressRows }] = await Promise.all([
      supabase
        .from("enrollments")
        .select("id, course_id, enrolled_at, expires_at")
        .eq("student_id", user.id),
      supabase
        .from("lesson_progress")
        .select("course_id, lesson_id, completed, updated_at")
        .eq("student_id", user.id),
    ]);

    if (!enrollments || enrollments.length === 0) {
      return [];
    }

    const progressByCourse = new Map<string, typeof progressRows>();
    for (const row of progressRows ?? []) {
      const list = progressByCourse.get(row.course_id) ?? [];
      list.push(row);
      progressByCourse.set(row.course_id, list);
    }

    const now = Date.now();
    const results: MyCourseEnrollment[] = [];

    for (const enrollment of enrollments) {
      const course = await getCourseById(enrollment.course_id);
      if (!course) {
        continue;
      }

      const totalLessons = course.curriculum.reduce(
        (sum, section) => sum + section.lessons.length,
        0,
      );
      const rows = progressByCourse.get(enrollment.course_id) ?? [];
      const completedCount = rows.filter((row) => row.completed).length;
      const progressPercent =
        totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

      const lastRow = [...rows].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0];
      const lastLesson = lastRow
        ? course.curriculum
            .flatMap((section) => section.lessons)
            .find((lesson) => lesson.id === lastRow.lesson_id)
        : undefined;

      const isExpired = !!enrollment.expires_at && new Date(enrollment.expires_at).getTime() < now;
      const status: EnrollmentStatus = isExpired
        ? "expired"
        : progressPercent >= 100
          ? "completed"
          : "in_progress";

      results.push({
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseSlug: course.slug,
        courseTitle: course.title,
        categorySlug: course.categorySlug,
        categoryLabel: course.categoryLabel,
        instructorName: course.instructorDetail.name,
        instructorAvatarUrl: course.instructorDetail.avatarUrl,
        progressPercent,
        lastLessonTitle: lastLesson?.title ?? null,
        lastActivityAt: lastRow?.updated_at ?? null,
        enrolledAt: enrollment.enrolled_at,
        expiresAt: enrollment.expires_at,
        status,
      });
    }

    return results.sort((a, b) => {
      const aTime = a.lastActivityAt ?? a.enrolledAt;
      const bTime = b.lastActivityAt ?? b.enrolledAt;
      return aTime < bTime ? 1 : -1;
    });
  } catch {
    return [];
  }
}
