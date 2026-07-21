import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import type { CurrentUser } from "@/features/auth/queries";

const ROLE_LABEL: Record<CurrentUser["role"], string> = {
  student: "Học viên",
  instructor: "Giảng viên",
  admin: "Quản trị viên",
};

export function DashboardShell({
  user,
  heading,
  actions,
}: {
  user: CurrentUser;
  heading: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
        <div className="flex items-center gap-2">
          {actions}
          <SignOutButton />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin tài khoản</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">Họ tên</span>
            <span>{user.fullName ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">Email</span>
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-24 shrink-0">Vai trò</span>
            <Badge variant="secondary">{ROLE_LABEL[user.role]}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
