import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

export function SectionHeading({
  title,
  description,
  viewAllHref,
}: {
  title: string;
  description?: string;
  viewAllHref?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="text-primary hover:text-primary/80 hidden shrink-0 items-center gap-1 text-sm font-medium transition-colors sm:flex"
        >
          Xem tất cả
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
