function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  appUrl: requireEnv("NEXT_PUBLIC_APP_URL", process.env.NEXT_PUBLIC_APP_URL),
  supabaseUrl: requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

export const isSupabaseConfigured =
  !env.supabaseUrl.includes("your-project.supabase.co") &&
  env.supabaseAnonKey !== "your-anon-key" &&
  !env.supabaseAnonKey.startsWith("placeholder");
