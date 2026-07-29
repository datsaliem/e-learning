import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PRIVATE_ROBOTS_METADATA } from "@/features/seo/metadata";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS_METADATA,
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center px-4 py-12">{children}</div>;
}
