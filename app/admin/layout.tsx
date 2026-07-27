import type { Metadata } from "next";
import type { ReactNode } from "react";

import { requireRole } from "@/features/auth/queries";
import { AdminSidebar } from "@/features/admin-dashboard/components/admin-sidebar";
import { PRIVATE_ROBOTS_METADATA } from "@/features/seo/metadata";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS_METADATA,
};

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireRole("admin");
  const name = admin.fullName ?? admin.email.split("@")[0] ?? "Quản trị viên";

  return (
    <div className="bg-muted/25 flex min-h-[calc(100vh-4rem)] flex-1 flex-col lg:flex-row">
      <AdminSidebar name={name} email={admin.email} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
