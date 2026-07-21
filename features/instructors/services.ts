import "server-only";

import type { Instructor } from "@/features/instructors/types";

const MOCK_INSTRUCTORS: Instructor[] = [
  {
    id: "ins-1",
    name: "Nguyễn Minh Khôi",
    avatarUrl: null,
    headline: "Senior Software Engineer",
    bio: "10 năm kinh nghiệm phát triển web tại các công ty công nghệ, chuyên sâu về React và Next.js.",
    studentCount: 8900,
    courseCount: 6,
    rating: 4.8,
  },
  {
    id: "ins-2",
    name: "Trần Thị Lan",
    avatarUrl: null,
    headline: "Data Scientist",
    bio: "Chuyên gia phân tích dữ liệu và machine learning, từng giảng dạy tại nhiều trung tâm đào tạo CNTT.",
    studentCount: 6200,
    courseCount: 4,
    rating: 4.7,
  },
  {
    id: "ins-3",
    name: "Phạm Anh Tuấn",
    avatarUrl: null,
    headline: "Creative Director",
    bio: "Hơn 10 năm kinh nghiệm thiết kế thương hiệu và sản phẩm số cho các doanh nghiệp trong và ngoài nước.",
    studentCount: 9300,
    courseCount: 5,
    rating: 4.9,
  },
  {
    id: "ins-4",
    name: "Lê Thu Hà",
    avatarUrl: null,
    headline: "Chuyên gia Digital Marketing",
    bio: "Tư vấn chiến lược marketing cho hơn 50 doanh nghiệp, chuyên sâu SEO và performance marketing.",
    studentCount: 4100,
    courseCount: 3,
    rating: 4.6,
  },
  {
    id: "ins-5",
    name: "Emily Nguyen",
    avatarUrl: null,
    headline: "Giảng viên tiếng Anh giao tiếp",
    bio: "Thạc sĩ Ngôn ngữ học ứng dụng, 8 năm giảng dạy tiếng Anh thương mại cho người đi làm.",
    studentCount: 5400,
    courseCount: 4,
    rating: 4.8,
  },
  {
    id: "ins-6",
    name: "Đỗ Quang Huy",
    avatarUrl: null,
    headline: "Founder & Business Coach",
    bio: "Sáng lập 2 startup, cố vấn khởi nghiệp cho các vườn ươm doanh nghiệp tại Việt Nam.",
    studentCount: 2100,
    courseCount: 2,
    rating: 4.5,
  },
  {
    id: "ins-7",
    name: "Vũ Thị Mai",
    avatarUrl: null,
    headline: "HR Director & Leadership Coach",
    bio: "15 năm kinh nghiệm nhân sự và phát triển tổ chức tại các tập đoàn đa quốc gia.",
    studentCount: 3300,
    courseCount: 3,
    rating: 4.7,
  },
];

const FEATURED_INSTRUCTOR_IDS = ["ins-3", "ins-1", "ins-5", "ins-4"];

export async function getFeaturedInstructors(limit = 4): Promise<Instructor[]> {
  return FEATURED_INSTRUCTOR_IDS.map((id) => MOCK_INSTRUCTORS.find((i) => i.id === id))
    .filter((i): i is Instructor => i !== undefined)
    .slice(0, limit);
}

export async function getInstructorById(id: string): Promise<Instructor | null> {
  return MOCK_INSTRUCTORS.find((instructor) => instructor.id === id) ?? null;
}
