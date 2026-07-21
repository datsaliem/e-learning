"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BookOpen, LogOut, Settings, UserRound } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/features/auth/actions";
import { safeAction } from "@/lib/safe-action";
import { getInitials } from "@/lib/utils";

export interface UserNavProps {
  name: string;
  email: string;
  avatarUrl?: string;
}

export function UserNav({ name, email, avatarUrl }: UserNavProps) {
  const [isSigningOut, startTransition] = React.useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const result = await safeAction(() => signOut());
      if (result?.error) {
        toast.error(result.error);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="focus-visible:ring-ring/50 rounded-full outline-none focus-visible:ring-3"
        aria-label="Menu tài khoản"
      >
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-1.5">
            <span className="text-foreground text-sm font-medium">{name}</span>
            <span className="text-muted-foreground text-xs font-normal">{email}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserRound />
            Hồ sơ của tôi
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/my-courses" />}>
            <BookOpen />
            Khoá học của tôi
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings" />}>
            <Settings />
            Cài đặt
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={isSigningOut} onClick={handleSignOut}>
          <LogOut />
          {isSigningOut ? "Đang đăng xuất..." : "Đăng xuất"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
