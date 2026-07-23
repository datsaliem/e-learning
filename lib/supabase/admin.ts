import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Privileged client for trusted server-only payment code. The key bypasses
 * RLS, so callers must authenticate/authorise the user before using it.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
