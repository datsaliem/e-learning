import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Nguyễn Văn A" -> "VA" — dùng cho AvatarFallback khi không có ảnh. */
export function getInitials(name: string): string {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}
