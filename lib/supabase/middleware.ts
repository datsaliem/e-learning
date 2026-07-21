import { NextResponse, type NextRequest } from "next/server";

import { env, isSupabaseConfigured } from "../env";

/**
 * Refresh session (access token) trước khi request tới Server Component.
 * Supabase access token hết hạn sau ~1 giờ; nếu không refresh ở middleware,
 * Server Component có thể đọc phải session đã hết hạn.
 */
export async function updateSession(request: NextRequest) {
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  if (!isSupabaseConfigured || !hasSupabaseAuthCookie) {
    return NextResponse.next({ request });
  }

  try {
    const { createServerClient } = await import("@supabase/ssr");
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    });

    // Không được bỏ dòng này: getUser() vừa xác thực JWT với Supabase Auth
    // server vừa kích hoạt việc refresh token khi cần.
    await supabase.auth.getUser();
    return supabaseResponse;
  } catch {
    // Auth refresh không được phép làm hỏng toàn bộ website nếu runtime hoặc
    // Supabase tạm thời không khả dụng.
    return NextResponse.next({ request });
  }
}
