import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const TONE_CLASS = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/15 text-secondary-foreground dark:text-secondary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  muted: "bg-muted text-muted-foreground",
} as const;

interface MetricCardProps {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  tone: keyof typeof TONE_CLASS;
}

export function MetricCard({ label, value, description, icon: Icon, tone }: MetricCardProps) {
  return (
    <Card className="min-w-0">
      <CardContent className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {label}
          </p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{description}</p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            TONE_CLASS[tone],
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
