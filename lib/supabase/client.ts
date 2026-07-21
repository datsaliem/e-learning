import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/** Supabase client dùng trong Client Component. Chỉ mang anon key — an toàn để lộ ra trình duyệt vì mọi quyền truy cập dữ liệu đều do RLS quyết định. */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
