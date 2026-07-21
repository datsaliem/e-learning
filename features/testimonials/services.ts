import "server-only";

import type { Testimonial } from "@/features/testimonials/types";

const MOCK_TESTIMONIALS: Testimonial[] = [
  {
    id: "test-1",
    studentName: "Hoàng Gia Bảo",
    avatarUrl: null,
    rating: 5,
    content:
      "Khoá học Next.js giúp mình chuyển việc thành công với mức lương tốt hơn hẳn. Giảng viên dạy rất dễ hiểu, có nhiều bài tập thực hành sát với công việc thực tế.",
    courseTitle: "Lập trình Web với Next.js & TypeScript",
  },
  {
    id: "test-2",
    studentName: "Ngô Thuỳ Dương",
    avatarUrl: null,
    rating: 5,
    content:
      "Mình vốn không có nền tảng kỹ thuật nhưng nhờ khoá Python mà giờ đã tự viết được script xử lý dữ liệu cho công việc hằng ngày. Rất đáng đồng tiền.",
    courseTitle: "Python cho người mới bắt đầu",
  },
  {
    id: "test-3",
    studentName: "Trịnh Bảo Long",
    avatarUrl: null,
    rating: 4,
    content:
      "Nội dung UI/UX rất bài bản, đi từ nghiên cứu người dùng đến hoàn thiện prototype. Sau khoá học mình đã tự tin làm portfolio cá nhân để apply việc.",
    courseTitle: "UI/UX Design từ A-Z với Figma",
  },
  {
    id: "test-4",
    studentName: "Phan Yến Nhi",
    avatarUrl: null,
    rating: 5,
    content:
      "Giảng viên Emily dạy phát âm và phản xạ giao tiếp cực kỳ hiệu quả. Mình đã tự tin thuyết trình bằng tiếng Anh trước khách hàng nước ngoài sau 2 tháng học.",
    courseTitle: "Giao tiếp tiếng Anh thương mại",
  },
  {
    id: "test-5",
    studentName: "Đặng Minh Quân",
    avatarUrl: null,
    rating: 5,
    content:
      "Khoá SEO cực kỳ thực tế, mình áp dụng ngay cho website công ty và tăng traffic tự nhiên hơn 40% chỉ sau 3 tháng.",
    courseTitle: "SEO Website từ cơ bản đến nâng cao",
  },
  {
    id: "test-6",
    studentName: "Lâm Bích Ngọc",
    avatarUrl: null,
    rating: 4,
    content:
      "Khoá lãnh đạo giúp mình tự tin hơn khi quản lý team 8 người. Nhiều tình huống thực tế và bài tập phản tư rất hữu ích.",
    courseTitle: "Kỹ năng lãnh đạo & quản lý đội nhóm",
  },
];

export async function getTestimonials(limit = 6): Promise<Testimonial[]> {
  return MOCK_TESTIMONIALS.slice(0, limit);
}
