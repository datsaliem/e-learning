import { Logo } from "@/components/layout/logo";
import { SearchForm } from "@/components/layout/search-form";
import { CourseCategoriesNav } from "@/components/layout/course-categories-nav";
import { AuthActions } from "@/components/layout/auth-actions";
import { UserNav, type UserNavProps } from "@/components/layout/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import { CartTrigger } from "@/features/cart/components/cart-trigger";
import { NotificationDropdown } from "@/features/notifications/components/notification-dropdown";
import type { NotificationSnapshot } from "@/features/notifications/types";

export interface SiteHeaderProps {
  /** Khi có giá trị, hiển thị menu tài khoản thay cho nút đăng nhập/đăng ký. */
  user?: UserNavProps & { id: string };
  notificationSnapshot?: NotificationSnapshot;
}

export function SiteHeader({ user, notificationSnapshot }: SiteHeaderProps) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4">
        <MobileNav />
        <Logo className="shrink-0" />

        <div className="hidden md:flex md:items-center md:gap-2">
          <CourseCategoriesNav />
        </div>

        <SearchForm className="hidden max-w-sm md:ml-auto md:block" />

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user && notificationSnapshot ? (
            <NotificationDropdown userId={user.id} initialSnapshot={notificationSnapshot} />
          ) : null}
          <CartTrigger />
          {user ? (
            <UserNav name={user.name} email={user.email} avatarUrl={user.avatarUrl} />
          ) : (
            <AuthActions className="hidden md:flex" />
          )}
        </div>
      </div>
    </header>
  );
}
