import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "text-foreground flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
        <GraduationCap className="size-5" aria-hidden="true" />
      </span>
      <span className="text-base">E-Learning</span>
    </Link>
  );
}
