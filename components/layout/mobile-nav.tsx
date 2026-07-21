import Link from "next/link";
import { MenuIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SearchForm } from "@/components/layout/search-form";
import { Logo } from "@/components/layout/logo";
import { courseCategories, mainNav } from "@/lib/nav-config";

export function MobileNav() {
  return (
    <Sheet>
      <SheetTrigger
        render={<Button variant="ghost" size="icon" className="md:hidden" />}
        aria-label="Mở menu điều hướng"
      >
        <MenuIcon />
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-xs">
        <SheetHeader>
          <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
          <Logo />
        </SheetHeader>

        <div className="flex flex-col gap-6 overflow-y-auto px-4 pb-4">
          <SearchForm />

          <nav aria-label="Điều hướng chính" className="flex flex-col gap-1">
            {mainNav.map((item) => (
              <SheetClose
                key={item.href}
                nativeButton={false}
                render={<Link href={item.href} />}
                className="hover:bg-muted flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium"
              >
                {item.icon && (
                  <item.icon className="text-muted-foreground size-4" aria-hidden="true" />
                )}
                {item.label}
              </SheetClose>
            ))}
          </nav>

          <Separator />

          <nav aria-label="Danh mục khoá học" className="flex flex-col gap-1">
            <span className="text-muted-foreground px-2.5 text-xs font-medium">
              Danh mục khoá học
            </span>
            {courseCategories.map((category) => (
              <SheetClose
                key={category.href}
                nativeButton={false}
                render={<Link href={category.href} />}
                className="hover:bg-muted flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm"
              >
                {category.icon && (
                  <category.icon className="text-muted-foreground size-4" aria-hidden="true" />
                )}
                {category.label}
              </SheetClose>
            ))}
          </nav>

          <Separator />

          <div className="flex flex-col gap-2">
            <SheetClose
              nativeButton={false}
              render={<Link href="/login" />}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Đăng nhập
            </SheetClose>
            <SheetClose
              nativeButton={false}
              render={<Link href="/register" />}
              className={cn(buttonVariants())}
            >
              Đăng ký
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
