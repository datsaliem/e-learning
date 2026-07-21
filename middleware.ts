import { type NextRequest } from "next/server";

import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  runtime: "nodejs",
  matcher: [
    /*
     * Áp dụng cho mọi route trừ static assets, ảnh và favicon — tránh
     * refresh session không cần thiết cho các request không liên quan auth.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
