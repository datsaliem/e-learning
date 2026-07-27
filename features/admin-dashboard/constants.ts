import {
  BarChart3Icon,
  BookOpenIcon,
  FolderTreeIcon,
  HouseIcon,
  LayoutDashboardIcon,
  ShoppingCartIcon,
  UsersIcon,
} from "lucide-react";

export const ADMIN_NAV_ITEMS = [
  {
    label: "Tổng quan",
    href: "/admin/dashboard",
    icon: LayoutDashboardIcon,
  },
  {
    label: "Người dùng",
    href: "/admin/users",
    icon: UsersIcon,
  },
  {
    label: "Khóa học",
    href: "/admin/courses",
    icon: BookOpenIcon,
  },
  {
    label: "Danh mục",
    href: "/admin/categories",
    icon: FolderTreeIcon,
  },
  {
    label: "Đơn hàng",
    href: "/admin/dashboard#orders",
    icon: ShoppingCartIcon,
  },
  {
    label: "Phân tích",
    href: "/admin/dashboard#analytics",
    icon: BarChart3Icon,
  },
] as const;

export const ADMIN_SECONDARY_NAV_ITEMS = [
  {
    label: "Về trang chủ",
    href: "/",
    icon: HouseIcon,
  },
] as const;
