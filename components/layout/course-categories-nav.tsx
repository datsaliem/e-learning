import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { courseCategories, mainNav } from "@/lib/nav-config";

export function CourseCategoriesNav() {
  return (
    <nav aria-label="Điều hướng chính" className="flex items-center gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "group gap-1")}>
          Danh mục khoá học
          <ChevronDownIcon
            className="text-muted-foreground size-3.5 transition-transform group-aria-expanded:rotate-180"
            aria-hidden="true"
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72 sm:w-96">
          <DropdownMenuGroup className="grid gap-1 sm:grid-cols-2">
            {courseCategories.map((category) => (
              <DropdownMenuItem key={category.href} render={<Link href={category.href} />}>
                {category.icon && (
                  <category.icon className="text-muted-foreground size-4" aria-hidden="true" />
                )}
                <span className="flex flex-col">
                  <span className="font-medium">{category.label}</span>
                  {category.description && (
                    <span className="text-muted-foreground text-xs">{category.description}</span>
                  )}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {mainNav.map((item) => (
        <Link key={item.href} href={item.href} className={cn(buttonVariants({ variant: "ghost" }))}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
