import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PRIVATE_ROBOTS_METADATA } from "@/features/seo/metadata";

export const metadata: Metadata = {
  robots: PRIVATE_ROBOTS_METADATA,
};

export default function InstructorLayout({ children }: { children: ReactNode }) {
  return children;
}
