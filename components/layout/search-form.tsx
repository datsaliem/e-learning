import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SearchForm({
  id = "course-search",
  className,
  inputClassName,
  showSubmitButton = false,
}: {
  id?: string;
  className?: string;
  inputClassName?: string;
  showSubmitButton?: boolean;
}) {
  return (
    <form role="search" action="/courses" method="GET" className={cn("w-full", className)}>
      <Label htmlFor={id} className="sr-only">
        Tìm kiếm khoá học
      </Label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <SearchIcon
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            id={id}
            name="q"
            type="search"
            placeholder="Tìm kiếm khoá học..."
            className={cn("pl-8", inputClassName)}
          />
        </div>
        {showSubmitButton && <Button type="submit">Tìm kiếm</Button>}
      </div>
    </form>
  );
}
