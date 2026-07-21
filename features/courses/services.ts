import "server-only";

import { courseCategories } from "@/lib/nav-config";
import { COURSE_DETAILS, COURSE_REVIEWS } from "@/features/courses/course-details-data";
import type { Course, CourseCategory, CourseDetail, CourseReview } from "@/features/courses/types";
import { getInstructorById } from "@/features/instructors/services";

/**
 * Mock data — chỗ duy nhất cần thay khi nối Supabase thật: giữ nguyên chữ
 * ký (signature) async của các hàm bên dưới, đổi phần thân sang truy vấn
 * `supabase.from("courses")...`, phía gọi (component) không cần đổi gì.
 */
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

export async function getPopularCourses(limit = 8): Promise<Course[]> {
  return [...MOCK_COURSES].sort((a, b) => b.studentCount - a.studentCount).slice(0, limit);
}

export async function getNewCourses(limit = 4): Promise<Course[]> {
  return [...MOCK_COURSES]
    .filter((course) => course.isNew)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);
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
  return buildCourseDetail(MOCK_COURSES.find((c) => c.slug === slug));
}

/** Dùng để join dữ liệu catalog vào enrollment/lesson_progress thật (xem features/enrollments). */
export async function getCourseById(id: string): Promise<CourseDetail | null> {
  return buildCourseDetail(MOCK_COURSES.find((c) => c.id === id));
}

export async function getRelatedCourses(course: Course, limit = 4): Promise<Course[]> {
  return [...MOCK_COURSES]
    .filter((c) => c.id !== course.id && c.categorySlug === course.categorySlug)
    .sort((a, b) => b.studentCount - a.studentCount)
    .slice(0, limit);
}

export async function getCourseReviews(courseId: string, limit = 10): Promise<CourseReview[]> {
  return (COURSE_REVIEWS[courseId] ?? []).slice(0, limit);
}
