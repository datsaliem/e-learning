import { NextResponse, type NextRequest } from "next/server";

import { env, isSupabaseConfigured } from "../env";

const ADMIN_PATH_PREFIX = "/admin";

function isAdminRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  return pathname === ADMIN_PATH_PREFIX || pathname.startsWith(`${ADMIN_PATH_PREFIX}/`);
}

function setPrivateNoStore(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  return response;
}

function copySessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie));
  return target;
}

function redirectToLogin(request: NextRequest, sessionResponse?: NextResponse): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);

  const redirectResponse = NextResponse.redirect(loginUrl);
  if (sessionResponse) {
    copySessionCookies(sessionResponse, redirectResponse);
  }

  return setPrivateNoStore(redirectResponse);
}

function redirectToRoleDashboard(
  request: NextRequest,
  role: string | null | undefined,
  sessionResponse: NextResponse,
): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = role === "instructor" ? "/instructor/dashboard" : "/dashboard";
  redirectUrl.search = "";

  return setPrivateNoStore(copySessionCookies(sessionResponse, NextResponse.redirect(redirectUrl)));
}

/**
 * Refresh session (access token) trước khi request tới Server Component.
 * Supabase access token hết hạn sau ~1 giờ; nếu không refresh ở middleware,
 * Server Component có thể đọc phải session đã hết hạn.
 */
export async function updateSession(request: NextRequest) {
  const requiresAdmin = isAdminRoute(request);
  const hasSupabaseAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("auth-token"));

  if (!isSupabaseConfigured) {
    return requiresAdmin ? redirectToLogin(request) : NextResponse.next({ request });
  }

  if (!hasSupabaseAuthCookie) {
    return requiresAdmin ? redirectToLogin(request) : NextResponse.next({ request });
  }

  if (!requiresAdmin) {
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
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value),
          );
        },
      },
    });

    // Không được bỏ dòng này: getUser() vừa xác thực JWT với Supabase Auth
    // server vừa kích hoạt việc refresh token khi cần.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectToLogin(request, supabaseResponse);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return redirectToLogin(request, supabaseResponse);
    }

    if (profile.role !== "admin") {
      return redirectToRoleDashboard(request, profile.role, supabaseResponse);
    }

    return setPrivateNoStore(supabaseResponse);
  } catch {
    // Admin routes fail closed when Auth or the role lookup is unavailable.
    return redirectToLogin(request);
  }
}
