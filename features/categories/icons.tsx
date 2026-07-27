import type { ComponentProps } from "react";
import {
  BookOpenIcon,
  BrainIcon,
  BriefcaseIcon,
  CalculatorIcon,
  CameraIcon,
  Code2Icon,
  DatabaseIcon,
  FolderIcon,
  Globe2Icon,
  LanguagesIcon,
  LineChartIcon,
  Music2Icon,
  PaletteIcon,
  RocketIcon,
  ShieldCheckIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICON_OPTIONS = [
  { value: "folder", label: "Thư mục", icon: FolderIcon },
  { value: "code-2", label: "Lập trình", icon: Code2Icon },
  { value: "palette", label: "Thiết kế", icon: PaletteIcon },
  { value: "briefcase", label: "Kinh doanh", icon: BriefcaseIcon },
  { value: "chart-no-axes-combined", label: "Marketing", icon: LineChartIcon },
  { value: "languages", label: "Ngôn ngữ", icon: LanguagesIcon },
  { value: "users", label: "Cộng đồng", icon: UsersIcon },
  { value: "book-open", label: "Giáo dục", icon: BookOpenIcon },
  { value: "brain", label: "Tư duy", icon: BrainIcon },
  { value: "database", label: "Dữ liệu", icon: DatabaseIcon },
  { value: "globe-2", label: "Toàn cầu", icon: Globe2Icon },
  { value: "rocket", label: "Khởi nghiệp", icon: RocketIcon },
  { value: "shield-check", label: "Bảo mật", icon: ShieldCheckIcon },
  { value: "camera", label: "Nhiếp ảnh", icon: CameraIcon },
  { value: "music-2", label: "Âm nhạc", icon: Music2Icon },
  { value: "calculator", label: "Toán học", icon: CalculatorIcon },
] as const;

export type CategoryIconKey = (typeof CATEGORY_ICON_OPTIONS)[number]["value"];

const CATEGORY_ICON_MAP = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((option) => [option.value, option.icon]),
) as Record<string, LucideIcon>;

export function CategoryIcon({
  name,
  ...props
}: { name: string } & Omit<ComponentProps<LucideIcon>, "ref">) {
  const Icon = CATEGORY_ICON_MAP[name] ?? FolderIcon;
  return <Icon {...props} />;
}
