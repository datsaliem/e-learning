"use client";

import * as React from "react";
import { toast } from "sonner";
import { CameraIcon, Loader2Icon } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { safeAction } from "@/lib/safe-action";
import { getInitials } from "@/lib/utils";
import { updateAvatarUrl } from "@/features/profile/actions";
import { validateAvatarFile } from "@/features/profile/schemas";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function AvatarUpload({
  userId,
  fullName,
  avatarUrl,
}: {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}) {
  const [preview, setPreview] = React.useState<string | null>(avatarUrl);
  const [isUploading, setIsUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const objectUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    const localPreview = URL.createObjectURL(file);
    objectUrlRef.current = localPreview;
    setPreview(localPreview);
    setIsUploading(true);

    try {
      const supabase = createClient();
      const ext = EXTENSION_BY_MIME[file.type] ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-busting: cùng path bị ghi đè nên phải thêm query param để
      // trình duyệt không hiển thị ảnh cũ từ cache.
      const freshUrl = `${publicUrl}?t=${Date.now()}`;

      const result = await safeAction(() => updateAvatarUrl(freshUrl));
      if (result?.error) {
        throw new Error(result.error);
      }

      setPreview(freshUrl);
      toast.success("Đã cập nhật ảnh đại diện.");
    } catch (error) {
      setPreview(avatarUrl);
      toast.error(
        error instanceof Error ? error.message : "Không thể tải ảnh lên. Vui lòng thử lại.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="size-20">
          {preview && <AvatarImage src={preview} alt={fullName} />}
          <AvatarFallback className="text-lg">{getInitials(fullName)}</AvatarFallback>
        </Avatar>
        {isUploading && (
          <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-full">
            <Loader2Icon className="text-foreground size-5 animate-spin" />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label="Đổi ảnh đại diện"
          className="bg-primary text-primary-foreground ring-background absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full ring-2 disabled:opacity-50"
        >
          <CameraIcon className="size-3.5" aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Chọn ảnh đại diện"
        />
      </div>
      <div className="text-muted-foreground text-sm">
        <p>JPG, PNG hoặc WEBP. Tối đa 2MB.</p>
      </div>
    </div>
  );
}
