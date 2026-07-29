"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuIcon, ShieldCheckIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ADMIN_NAV_ITEMS, ADMIN_SECONDARY_NAV_ITEMS } from "@/features/admin-dashboard/constants";
import { cn, getInitials } from "@/lib/utils";

interface AdminSidebarProps {
  name: string;
  email: string;
}

function SidebarBrand() {
  return (
    <div className="flex items-center gap-3 px-3">
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl">
        <ShieldCheckIcon className="size-5" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold tracking-tight">Admin Console</p>
        <p className="text-muted-foreground text-xs">E-Learning</p>
      </div>
    </div>
  );
}

function SidebarLinks({ closeOnNavigate = false }: { closeOnNavigate?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      <nav aria-label="Điều hướng quản trị" className="flex flex-col gap-1">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isOverview = item.href === "/admin/dashboard";
          const isActive = isOverview
            ? pathname === item.href
            : !item.href.includes("#") && pathname.startsWith(item.href);
          const className = cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          );
          const content = (
            <>
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </>
          );

          return closeOnNavigate ? (
            <SheetClose
              key={item.href}
              nativeButton={false}
              render={<Link href={item.href} aria-current={isActive ? "page" : undefined} />}
              className={className}
            >
              {content}
            </SheetClose>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={className}
            >
              {content}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-3" />

      <nav aria-label="Liên kết khác" className="flex flex-col gap-1">
        {ADMIN_SECONDARY_NAV_ITEMS.map((item) =>
          closeOnNavigate ? (
            <SheetClose
              key={item.href}
              nativeButton={false}
              render={<Link href={item.href} />}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </SheetClose>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          ),
        )}
      </nav>
    </>
  );
}

function AdminIdentity({ name, email }: AdminSidebarProps) {
  return (
    <div className="bg-muted/60 flex items-center gap-3 rounded-xl p-3">
      <Avatar className="size-9">
        <AvatarFallback>{getInitials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="text-muted-foreground truncate text-xs">{email}</p>
      </div>
      <Badge variant="secondary">Admin</Badge>
    </div>
  );
}

export function AdminSidebar({ name, email }: AdminSidebarProps) {
  return (
    <>
      <aside className="border-border bg-background sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r lg:flex lg:flex-col">
        <div className="py-5">
          <SidebarBrand />
        </div>
        <Separator />
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarLinks />
        </div>
        <div className="border-t p-3">
          <AdminIdentity name={name} email={email} />
        </div>
      </aside>

      <div className="border-border bg-background/95 sticky top-16 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="text-primary size-5" aria-hidden="true" />
          <span className="font-semibold">Admin Console</span>
        </div>
        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" />}
            aria-label="Mở menu quản trị"
          >
            <MenuIcon aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="left" className="w-full sm:max-w-xs">
            <SheetHeader>
              <SheetTitle className="sr-only">Menu quản trị</SheetTitle>
              <SidebarBrand />
            </SheetHeader>
            <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-4">
              <SidebarLinks closeOnNavigate />
              <div className="mt-auto pt-6">
                <AdminIdentity name={name} email={email} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
