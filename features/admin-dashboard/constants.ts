import {
  BarChart3Icon,
  BookOpenIcon,
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
    href: "/admin/dashboard#users",
    icon: UsersIcon,
  },
  {
    label: "Khóa học",
    href: "/admin/courses",
    icon: BookOpenIcon,
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
