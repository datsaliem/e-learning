import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface ProfileDetail {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
}

/** Hồ sơ đầy đủ của user đang đăng nhập, dùng để đổ dữ liệu vào form chỉnh sửa. Giả định caller đã xác thực (dùng sau requireUser()). */
export async function getMyProfile(): Promise<ProfileDetail | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, phone, headline, bio, website")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    phone: profile?.phone ?? null,
    headline: profile?.headline ?? null,
    bio: profile?.bio ?? null,
    website: profile?.website ?? null,
  };
}
