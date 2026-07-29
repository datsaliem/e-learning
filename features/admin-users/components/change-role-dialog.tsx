"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, ShieldCheckIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { changeUserRole } from "@/features/admin-users/actions";
import { USER_ROLE_LABELS } from "@/features/admin-users/constants";
import { changeUserRoleSchema, type ChangeUserRoleInput } from "@/features/admin-users/schemas";
import type { AdminManagedUser, AdminUserMutationResult } from "@/features/admin-users/types";
import { safeAction } from "@/lib/safe-action";

export function ChangeRoleDialog({
  user,
  onOpenChange,
  onCompleted,
}: {
  user: AdminManagedUser | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: (data: Extract<AdminUserMutationResult, { data: unknown }>["data"]) => void;
}) {
  const form = useForm<ChangeUserRoleInput>({
    resolver: zodResolver(changeUserRoleSchema),
    defaultValues: {
      userId: user?.id ?? "",
      role: user?.role ?? "student",
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!user) return;
    form.reset({
      userId: user.id,
      role: user.role,
      reason: "",
    });
  }, [form, user]);

  if (!user) return null;

  const name = user.fullName?.trim() || user.email;

  async function onSubmit(values: ChangeUserRoleInput) {
    const result = await safeAction(() => changeUserRole(values));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success("Vai trò người dùng đã được cập nhật.");
    onCompleted(result.data);
    onOpenChange(false);
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!form.formState.isSubmitting) onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <ShieldCheckIcon className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>Thay đổi vai trò</DialogTitle>
          </div>
          <DialogDescription>
            Cập nhật quyền truy cập cho “{name}”. Thay đổi sẽ được ghi vào audit log.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id="change-user-role-form"
            className="grid gap-4"
            onSubmit={form.handleSubmit(onSubmit)}
          >
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vai trò mới</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(USER_ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Vai trò hiện tại: {USER_ROLE_LABELS[user.role]}.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lý do thay đổi</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-28 resize-y"
                      maxLength={500}
                      placeholder="Ví dụ: Đã xác minh hồ sơ giảng viên..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>{field.value.length}/500 ký tự</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            form="change-user-role-form"
            disabled={form.formState.isSubmitting || form.watch("role") === user.role}
          >
            {form.formState.isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <ShieldCheckIcon aria-hidden="true" />
            )}
            Lưu vai trò
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
