import type { LucideIcon } from "lucide-react";
import type { ComponentType, SVGProps } from "react";

export interface NavLink {
  label: string;
  href: string;
  description?: string;
  icon?: LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;
}

export interface NavLinkGroup {
  title: string;
  links: NavLink[];
}
