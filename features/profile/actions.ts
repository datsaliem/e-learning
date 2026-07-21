"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  normalizeOptionalText,
  normalizeWebsite,
  profileSchema,
  type ProfileInput,
} from "@/features/profile/schemas";
import type { ActionResult } from "@/types/actions";

export async function updateProfile(input: ProfileInput): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Dữ liệu không hợp lệ." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName.trim(),
      phone: normalizeOptionalText(parsed.data.phone),
      headline: normalizeOptionalText(parsed.data.headline),
      bio: normalizeOptionalText(parsed.data.bio),
      website: normalizeWebsite(parsed.data.website),
    })
    .eq("id", user.id);

  if (error) {
    return { error: "Không thể cập nhật hồ sơ. Vui lòng thử lại." };
  }

  revalidatePath("/", "layout");
}

/**
 * Chỉ lưu URL avatar đã upload xong lên Supabase Storage (xem
 * features/profile/components/avatar-upload.tsx) — file được đẩy trực tiếp
 * từ browser lên Storage bằng anon key + RLS, không đi qua action này, vì
 * Server Action mặc định giới hạn payload ~1MB, không phù hợp để truyền file
 * ảnh nhị phân.
 */
export async function updateAvatarUrl(avatarUrl: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) {
    return { error: "Không thể cập nhật ảnh đại diện. Vui lòng thử lại." };
  }

  revalidatePath("/", "layout");
}
