import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Supabase client dùng trong Server Component / Server Action / Route Handler.
 * Đọc/ghi session qua cookie của request hiện tại — vẫn chỉ dùng anon key,
 * KHÔNG dùng service_role (service_role bỏ qua RLS, tuyệt đối không dùng
 * trong đường đi phục vụ request của người dùng).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Được gọi từ một Server Component (không có quyền set cookie).
          // Middleware sẽ đảm nhiệm việc refresh session trong trường hợp này.
        }
      },
    },
  });
}
