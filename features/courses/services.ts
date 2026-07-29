import "server-only";

import { courseCategories } from "@/lib/nav-config";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/uuid";
import { COURSE_DETAILS, COURSE_REVIEWS } from "@/features/courses/course-details-data";
import type { Course, CourseCategory, CourseDetail, CourseReview } from "@/features/courses/types";
import { getInstructorById } from "@/features/instructors/services";
import type { Instructor } from "@/features/instructors/types";

/** Dữ liệu minh hoạ được giữ làm fallback khi catalog thật chưa có nội dung. */
const MOCK_COURSES: Course[] = [
  {
    id: "course-1",
    slug: "lap-trinh-web-nextjs-typescript",
    title: "Lập trình Web với Next.js & TypeScript",
    description:
      "Xây dựng ứng dụng web full-stack hiện đại với Next.js App Router, TypeScript và Supabase.",
    categorySlug: "lap-trinh",
    categoryLabel: "Lập trình",
    level: "advanced",
    price: 799000,
    originalPrice: 1199000,
    rating: 4.8,
    reviewCount: 342,
    studentCount: 2150,
    durationHours: 24,
    lessonCount: 86,
    instructor: { id: "ins-1", name: "Nguyễn Minh Khôi", avatarUrl: null },
    isNew: false,
    publishedAt: "2025-11-02",
  },
  {
    id: "course-2",
    slug: "python-cho-nguoi-moi-bat-dau",
    title: "Python cho người mới bắt đầu",
    description:
      "Nắm vững nền tảng lập trình Python từ con số 0, thực hành qua các dự án nhỏ thực tế.",
    categorySlug: "lap-trinh",
    categoryLabel: "Lập trình",
    level: "beginner",
    price: 399000,
    rating: 4.7,
    reviewCount: 890,
    studentCount: 5400,
    durationHours: 18,
    lessonCount: 64,
    instructor: { id: "ins-2", name: "Trần Thị Lan", avatarUrl: null },
    isNew: false,
    publishedAt: "2025-09-15",
  },
  {
    id: "course-3",
    slug: "uiux-design-tu-a-den-z-voi-figma",
    title: "UI/UX Design từ A-Z với Figma",
    description:
      "Quy trình thiết kế sản phẩm số hoàn chỉnh: nghiên cứu người dùng, wireframe, prototype.",
    categorySlug: "thiet-ke",
    categoryLabel: "Thiết kế",
    level: "beginner",
    price: 599000,
    originalPrice: 899000,
    rating: 4.9,
    reviewCount: 512,
    studentCount: 3100,
    durationHours: 20,
    lessonCount: 72,
    instructor: { id: "ins-3", name: "Phạm Anh Tuấn", avatarUrl: null },
    isNew: false,
    publishedAt: "2025-10-20",
  },
  {
    id: "course-4",
    slug: "digital-marketing-toan-dien-2026",
    title: "Digital Marketing toàn diện 2026",
    description: "SEO, quảng cáo Facebook/Google, email marketing và xây dựng thương hiệu cá nhân.",
    categorySlug: "marketing",
    categoryLabel: "Marketing",
    level: "intermediate",
    price: 699000,
    rating: 4.6,
    reviewCount: 210,
    studentCount: 1800,
    durationHours: 16,
    lessonCount: 58,
    instructor: { id: "ins-4", name: "Lê Thu Hà", avatarUrl: null },
    isNew: true,
    publishedAt: "2026-07-10",
  },
  {
    id: "course-5",
    slug: "giao-tiep-tieng-anh-thuong-mai",
    title: "Giao tiếp tiếng Anh thương mại",
    description:
      "Tự tin giao tiếp, thuyết trình và đàm phán bằng tiếng Anh trong môi trường công sở.",
    categorySlug: "ngoai-ngu",
    categoryLabel: "Ngoại ngữ",
    level: "intermediate",
    price: 499000,
    rating: 4.8,
    reviewCount: 670,
    studentCount: 4200,
    durationHours: 30,
    lessonCount: 96,
    instructor: { id: "ins-5", name: "Emily Nguyen", avatarUrl: null },
    isNew: false,
    publishedAt: "2025-08-05",
  },
  {
    id: "course-6",
    slug: "khoi-nghiep-tinh-gon-lean-startup",
    title: "Khởi nghiệp tinh gọn (Lean Startup)",
    description:
      "Phương pháp xác thực ý tưởng kinh doanh nhanh, tiết kiệm chi phí và giảm rủi ro thất bại.",
    categorySlug: "kinh-doanh",
    categoryLabel: "Kinh doanh",
    level: "intermediate",
    price: 899000,
    rating: 4.5,
    reviewCount: 145,
    studentCount: 980,
    durationHours: 14,
    lessonCount: 42,
    instructor: { id: "ins-6", name: "Đỗ Quang Huy", avatarUrl: null },
    isNew: true,
    publishedAt: "2026-07-05",
  },
  {
    id: "course-7",
    slug: "ky-nang-lanh-dao-quan-ly-doi-nhom",
    title: "Kỹ năng lãnh đạo & quản lý đội nhóm",
    description:
      "Phát triển tư duy lãnh đạo, giao việc hiệu quả và xây dựng văn hoá đội nhóm gắn kết.",
    categorySlug: "ky-nang-mem",
    categoryLabel: "Kỹ năng mềm",
    level: "advanced",
    price: 549000,
    rating: 4.7,
    reviewCount: 198,
    studentCount: 1250,
    durationHours: 12,
    lessonCount: 36,
    instructor: { id: "ins-7", name: "Vũ Thị Mai", avatarUrl: null },
    isNew: true,
    publishedAt: "2026-06-28",
  },
  {
    id: "course-8",
    slug: "react-native-xay-app-di-dong-da-nen-tang",
    title: "React Native: Xây App di động đa nền tảng",
    description:
      "Xây dựng ứng dụng iOS & Android từ một codebase duy nhất với React Native và Expo.",
    categorySlug: "lap-trinh",
    categoryLabel: "Lập trình",
    level: "intermediate",
    price: 899000,
    rating: 4.9,
    reviewCount: 267,
    studentCount: 1620,
    durationHours: 26,
    lessonCount: 78,
    instructor: { id: "ins-1", name: "Nguyễn Minh Khôi", avatarUrl: null },
    isNew: true,
    publishedAt: "2026-07-15",
  },
  {
    id: "course-9",
    slug: "nhiep-anh-va-dung-phim-co-ban",
    title: "Nhiếp ảnh & Dựng phim cơ bản",
    description: "Làm chủ máy ảnh, bố cục, ánh sáng và dựng video cơ bản với phần mềm miễn phí.",
    categorySlug: "thiet-ke",
    categoryLabel: "Thiết kế",
    level: "beginner",
    price: 0,
    rating: 4.4,
    reviewCount: 320,
    studentCount: 6100,
    durationHours: 8,
    lessonCount: 28,
    instructor: { id: "ins-3", name: "Phạm Anh Tuấn", avatarUrl: null },
    isNew: false,
    publishedAt: "2025-06-12",
  },
  {
    id: "course-10",
    slug: "seo-website-tu-co-ban-den-nang-cao",
    title: "SEO Website từ cơ bản đến nâng cao",
    description:
      "Tối ưu website lên top Google: nghiên cứu từ khoá, SEO onpage, offpage và kỹ thuật.",
    categorySlug: "marketing",
    categoryLabel: "Marketing",
    level: "beginner",
    price: 449000,
    rating: 4.6,
    reviewCount: 155,
    studentCount: 2300,
    durationHours: 10,
    lessonCount: 34,
    instructor: { id: "ins-4", name: "Lê Thu Hà", avatarUrl: null },
    isNew: true,
    publishedAt: "2026-06-30",
  },
];

/** Số lượng khoá học trong catalog theo từng danh mục — ở backend thật đây là COUNT(*) GROUP BY category. */
const CATEGORY_COURSE_COUNTS: Record<string, number> = {
  "lap-trinh": 128,
  "thiet-ke": 64,
  "kinh-doanh": 52,
  marketing: 47,
  "ngoai-ngu": 39,
  "ky-nang-mem": 28,
};

interface PublishedCourseRow {
  course_id: string;
  slug: string;
  title: string;
  short_description: string;
  full_description: string;
  category: string;
  level: Course["level"];
  language: string;
  thumbnail_url: string | null;
  trailer_url: string | null;
  price: number | string;
  sale_price: number | string | null;
  published_at: string;
  instructor_id: string;
  instructor_name: string;
  instructor_avatar_url: string | null;
  instructor_headline: string;
  instructor_bio: string;
  student_count: number | string;
  lesson_count: number | string;
  duration_seconds: number | string;
  review_count: number | string;
  rating: number | string;
}

interface PublishedCurriculumRow {
  section_id: string;
  section_title: string;
  section_sort_order: number;
  lesson_id: string | null;
  lesson_title: string | null;
  lesson_duration_seconds: number | null;
  lesson_is_preview: boolean | null;
  lesson_sort_order: number | null;
}

function getCategoryLabel(slug: string): string {
  return (
    courseCategories.find((category) => category.href.endsWith(`category=${slug}`))?.label ??
    "Khoá học"
  );
}

function toSafeNumber(value: number | string | null, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function mapPublishedCourse(row: PublishedCourseRow): Course {
  const listPrice = toSafeNumber(row.price);
  const salePrice = row.sale_price === null ? null : toSafeNumber(row.sale_price);
  const publishedAt = row.published_at;
  const publishedTime = new Date(publishedAt).getTime();
  const isNew =
    Number.isFinite(publishedTime) && Date.now() - publishedTime <= 30 * 24 * 60 * 60 * 1000;

  return {
    id: row.course_id,
    slug: row.slug,
    title: row.title,
    description: row.short_description || row.full_description,
    categorySlug: row.category,
    categoryLabel: getCategoryLabel(row.category),
    level: row.level,
    price: salePrice ?? listPrice,
    ...(salePrice === null ? {} : { originalPrice: listPrice }),
    rating: toSafeNumber(row.rating),
    reviewCount: Math.trunc(toSafeNumber(row.review_count)),
    studentCount: Math.trunc(toSafeNumber(row.student_count)),
    durationHours: Math.round((toSafeNumber(row.duration_seconds) / 3600) * 10) / 10,
    lessonCount: Math.trunc(toSafeNumber(row.lesson_count)),
    thumbnailUrl: row.thumbnail_url,
    language: row.language,
    instructor: {
      id: row.instructor_id,
      name: row.instructor_name,
      avatarUrl: row.instructor_avatar_url,
    },
    isNew,
    publishedAt,
  };
}

function mapPublishedInstructor(row: PublishedCourseRow): Instructor {
  return {
    id: row.instructor_id,
    name: row.instructor_name,
    avatarUrl: row.instructor_avatar_url,
    headline: row.instructor_headline || "Giảng viên E-Learning",
    bio: row.instructor_bio,
    studentCount: Math.trunc(toSafeNumber(row.student_count)),
    courseCount: 1,
    rating: toSafeNumber(row.rating),
  };
}

async function getPublishedRows(input?: {
  slug?: string;
  courseId?: string;
  limit?: number;
}): Promise<PublishedCourseRow[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_published_course_catalog", {
      p_slug: input?.slug ?? null,
      p_course_id: input?.courseId ?? null,
      p_limit: input?.limit ?? 50,
    });

    if (error || !data) return [];
    return data as unknown as PublishedCourseRow[];
  } catch {
    return [];
  }
}

async function getPublishedCurriculum(courseId: string): Promise<CourseDetail["curriculum"]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_published_course_curriculum", {
      p_course_id: courseId,
    });
    if (error || !data) return [];

    const sections = new Map<string, CourseDetail["curriculum"][number]>();
    for (const row of data as unknown as PublishedCurriculumRow[]) {
      const section = sections.get(row.section_id) ?? {
        id: row.section_id,
        title: row.section_title,
        lessons: [],
      };

      if (row.lesson_id && row.lesson_title) {
        section.lessons.push({
          id: row.lesson_id,
          title: row.lesson_title,
          durationMinutes: Math.max(1, Math.ceil(toSafeNumber(row.lesson_duration_seconds) / 60)),
          isPreview: row.lesson_is_preview ?? false,
        });
      }

      sections.set(row.section_id, section);
    }

    return [...sections.values()];
  } catch {
    return [];
  }
}

async function buildPublishedCourseDetail(
  row: PublishedCourseRow | undefined,
): Promise<CourseDetail | null> {
  if (!row) return null;

  return {
    ...mapPublishedCourse(row),
    longDescription: row.full_description || row.short_description,
    objectives: [],
    requirements: [],
    curriculum: await getPublishedCurriculum(row.course_id),
    instructorDetail: mapPublishedInstructor(row),
  };
}

export async function getPopularCourses(limit = 8): Promise<Course[]> {
  const databaseCourses = (await getPublishedRows({ limit: 100 })).sort(
    (a, b) => toSafeNumber(b.student_count) - toSafeNumber(a.student_count),
  );
  const databaseMapped = databaseCourses.map(mapPublishedCourse);
  const fallback = [...MOCK_COURSES].sort((a, b) => b.studentCount - a.studentCount);
  return [...databaseMapped, ...fallback].slice(0, limit);
}

export async function getNewCourses(limit = 4): Promise<Course[]> {
  const databaseCourses = (await getPublishedRows({ limit })).map(mapPublishedCourse);
  const fallback = [...MOCK_COURSES]
    .filter((course) => course.isNew)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);

  return [...databaseCourses, ...fallback].slice(0, limit);
}

export type CourseCatalogSort = "popular" | "newest";

export interface CourseCatalogFilters {
  query?: string;
  category?: string;
  sort?: CourseCatalogSort;
}

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("vi")
    .trim();
}

/** Danh sách dùng cho trang catalog, có tìm kiếm, lọc danh mục và sắp xếp. */
export async function getCourseCatalog(filters: CourseCatalogFilters = {}): Promise<Course[]> {
  const databaseCourses = (await getPublishedRows({ limit: 100 })).map(mapPublishedCourse);
  const source = databaseCourses.length > 0 ? databaseCourses : [...MOCK_COURSES];
  const query = normalizeSearchValue(filters.query ?? "");

  const courses = source.filter((course) => {
    if (filters.category && course.categorySlug !== filters.category) {
      return false;
    }

    if (!query) {
      return true;
    }

    return normalizeSearchValue(
      [course.title, course.description, course.categoryLabel, course.instructor.name].join(" "),
    ).includes(query);
  });

  return courses.sort((a, b) => {
    if (filters.sort === "newest") {
      return b.publishedAt.localeCompare(a.publishedAt);
    }

    return b.studentCount - a.studentCount;
  });
}

export async function getFeaturedCategories(): Promise<CourseCategory[]> {
  return courseCategories.map((category) => {
    const slug = category.href.split("category=")[1] ?? "";
    return {
      slug,
      label: category.label,
      description: category.description ?? "",
      icon: category.icon,
      courseCount: CATEGORY_COURSE_COUNTS[slug] ?? 0,
    };
  });
}

async function buildCourseDetail(course: Course | undefined): Promise<CourseDetail | null> {
  if (!course) {
    return null;
  }

  const detail = COURSE_DETAILS[course.id];
  const instructorDetail = await getInstructorById(course.instructor.id);
  if (!detail || !instructorDetail) {
    return null;
  }

  return { ...course, ...detail, instructorDetail };
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail | null> {
  const databaseCourse = await buildPublishedCourseDetail(
    (await getPublishedRows({ slug, limit: 1 }))[0],
  );
  if (databaseCourse) return databaseCourse;

  return buildCourseDetail(MOCK_COURSES.find((c) => c.slug === slug));
}

/** Dùng để join dữ liệu catalog vào enrollment/lesson_progress thật. */
export async function getCourseById(id: string): Promise<CourseDetail | null> {
  if (isUuid(id)) {
    const databaseCourse = await buildPublishedCourseDetail(
      (await getPublishedRows({ courseId: id, limit: 1 }))[0],
    );
    if (databaseCourse) return databaseCourse;
  }

  return buildCourseDetail(MOCK_COURSES.find((c) => c.id === id));
}

export async function getRelatedCourses(course: Course, limit = 4): Promise<Course[]> {
  if (isUuid(course.id)) {
    const databaseCourses = (await getPublishedRows({ limit: 100 }))
      .filter(
        (candidate) =>
          candidate.course_id !== course.id && candidate.category === course.categorySlug,
      )
      .map(mapPublishedCourse)
      .slice(0, limit);
    if (databaseCourses.length > 0) return databaseCourses;
  }

  return [...MOCK_COURSES]
    .filter((c) => c.id !== course.id && c.categorySlug === course.categorySlug)
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, limit);
}

export async function getCourseReviews(courseId: string, limit = 10): Promise<CourseReview[]> {
  if (isUuid(courseId)) return [];
  return (COURSE_REVIEWS[courseId] ?? []).slice(0, limit);
}
