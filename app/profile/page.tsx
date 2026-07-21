import type { Metadata } from "next";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/features/auth/queries";
import { getMyProfile } from "@/features/profile/queries";
import { AvatarUpload } from "@/features/profile/components/avatar-upload";
import { ProfileForm } from "@/features/profile/components/profile-form";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi",
};

export default async function ProfilePage() {
  const user = await requireUser();
  const profile = (await getMyProfile()) ?? {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: null,
    phone: null,
    headline: null,
    bio: null,
    website: null,
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Hồ sơ của tôi</h1>
        <p className="text-muted-foreground text-sm">
          Quản lý thông tin cá nhân hiển thị trên E-Learning.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ảnh đại diện</CardTitle>
          <CardDescription>{profile.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            userId={profile.id}
            fullName={profile.fullName ?? profile.email}
            avatarUrl={profile.avatarUrl}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin cá nhân</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  );
}
