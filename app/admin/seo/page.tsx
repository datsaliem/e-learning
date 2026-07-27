import type { Metadata } from "next";

import { requireRole } from "@/features/auth/queries";
import { AdminSeoPage } from "@/features/seo/components/admin-seo-page";
import { getAdminSeoData } from "@/features/seo/queries";

export const metadata: Metadata = {
  title: "Quản lý SEO",
  description: "Quản lý metadata, robots.txt và registry sitemap của website.",
};

export const dynamic = "force-dynamic";

export default async function AdminSeoRoute() {
  await requireRole("admin");
  const data = await getAdminSeoData();

  return <AdminSeoPage data={data} />;
}
