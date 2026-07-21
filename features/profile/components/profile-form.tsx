"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2Icon, OctagonXIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { safeAction } from "@/lib/safe-action";
import { updateProfile } from "@/features/profile/actions";
import { profileSchema, type ProfileFormValues } from "@/features/profile/schemas";
import type { ProfileDetail } from "@/features/profile/queries";

export function ProfileForm({ profile }: { profile: ProfileDetail }) {
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile.fullName ?? "",
      phone: profile.phone ?? "",
      headline: profile.headline ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
    },
  });

  function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    startTransition(async () => {
      const result = await safeAction(() => updateProfile(values));
      if (result?.error) {
        setFormError(result.error);
        return;
      }
      toast.success("Đã cập nhật hồ sơ.");
      form.reset(values);
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        {formError && (
          <Alert variant="destructive">
            <OctagonXIcon />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input autoComplete="name" placeholder="Nguyễn Văn A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="headline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chức danh</FormLabel>
              <FormControl>
                <Input placeholder="Frontend Developer tại ABC" {...field} />
              </FormControl>
              <FormDescription>Hiển thị ngay dưới tên của bạn.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Số điện thoại</FormLabel>
              <FormControl>
                <Input type="tel" autoComplete="tel" placeholder="0901234567" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="vidu.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Giới thiệu</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Vài dòng giới thiệu về bạn..."
                  className="min-h-24"
                  {...field}
                />
              </FormControl>
              <FormDescription>Tối đa 500 ký tự.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isPending || !form.formState.isDirty}
          className="mt-2 self-start"
        >
          {isPending && <Loader2Icon className="animate-spin" />}
          Lưu thay đổi
        </Button>
      </form>
    </Form>
  );
}
