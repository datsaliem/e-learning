import {
  BookOpen,
  Briefcase,
  Code2,
  Languages,
  LineChart,
  Palette,
  Sparkles,
  Users,
} from "lucide-react";

import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  YoutubeIcon,
} from "@/components/shared/social-icons";
import type { NavLink, NavLinkGroup } from "@/types/nav";

/** Danh mục khoá học hiển thị trong dropdown ở header. */
export const courseCategories: NavLink[] = [
  {
    label: "Lập trình",
    href: "/courses?category=lap-trinh",
    description: "Web, mobile, dữ liệu và AI",
    icon: Code2,
  },
  {
    label: "Thiết kế",
    href: "/courses?category=thiet-ke",
    description: "UI/UX, đồ hoạ, video",
    icon: Palette,
  },
  {
    label: "Kinh doanh",
    href: "/courses?category=kinh-doanh",
    description: "Khởi nghiệp, quản trị, bán hàng",
    icon: Briefcase,
  },
  {
    label: "Marketing",
    href: "/courses?category=marketing",
    description: "Digital marketing, SEO, quảng cáo",
    icon: LineChart,
  },
  {
    label: "Ngoại ngữ",
    href: "/courses?category=ngoai-ngu",
    description: "Tiếng Anh, Nhật, Hàn, Trung",
    icon: Languages,
  },
  {
    label: "Kỹ năng mềm",
    href: "/courses?category=ky-nang-mem",
    description: "Giao tiếp, lãnh đạo, làm việc nhóm",
    icon: Users,
  },
];

/** Liên kết cấp cao khác ngoài danh mục khoá học. */
export const mainNav: NavLink[] = [
  { label: "Tất cả khoá học", href: "/courses", icon: BookOpen },
  { label: "Trở thành giảng viên", href: "/instructors/apply", icon: Sparkles },
];

/** Các nhóm liên kết hiển thị trong footer. */
export const footerLinkGroups: NavLinkGroup[] = [
  {
    title: "Khoá học",
    links: courseCategories.map(({ label, href }) => ({ label, href })),
  },
  {
    title: "Hỗ trợ",
    links: [
      { label: "Trung tâm trợ giúp", href: "/help" },
      { label: "Liên hệ", href: "/contact" },
      { label: "Câu hỏi thường gặp", href: "/faq" },
    ],
  },
  {
    title: "Điều khoản",
    links: [
      { label: "Điều khoản dịch vụ", href: "/terms" },
      { label: "Chính sách bảo mật", href: "/privacy" },
      { label: "Chính sách hoàn tiền", href: "/refund-policy" },
    ],
  },
];

/** Liên kết mạng xã hội hiển thị ở footer. */
export const socialLinks: NavLink[] = [
  { label: "Facebook", href: "https://facebook.com", icon: FacebookIcon },
  { label: "Instagram", href: "https://instagram.com", icon: InstagramIcon },
  { label: "YouTube", href: "https://youtube.com", icon: YoutubeIcon },
  { label: "LinkedIn", href: "https://linkedin.com", icon: LinkedinIcon },
];
