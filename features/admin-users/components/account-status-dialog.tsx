"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon, LockKeyholeIcon, LockKeyholeOpenIcon } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { setUserBlocked } from "@/features/admin-users/actions";
import { setUserBlockedSchema, type SetUserBlockedInput } from "@/features/admin-users/schemas";
import type { AdminManagedUser, AdminUserMutationResult } from "@/features/admin-users/types";
import { safeAction } from "@/lib/safe-action";

export interface AccountStatusDialogState {
  user: AdminManagedUser;
  blocked: boolean;
}

export function AccountStatusDialog({
  state,
  onOpenChange,
  onCompleted,
}: {
  state: AccountStatusDialogState | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: (data: Extract<AdminUserMutationResult, { data: unknown }>["data"]) => void;
}) {
  const form = useForm<SetUserBlockedInput>({
    resolver: zodResolver(setUserBlockedSchema),
    defaultValues: {
      userId: state?.user.id ?? "",
      blocked: state?.blocked ?? true,
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!state) return;
    form.reset({
      userId: state.user.id,
      blocked: state.blocked,
      reason: "",
    });
  }, [form, state]);

  if (!state) return null;

  const name = state.user.fullName?.trim() || state.user.email;
  const Icon = state.blocked ? LockKeyholeIcon : LockKeyholeOpenIcon;

  async function onSubmit(values: SetUserBlockedInput) {
    const result = await safeAction(() => setUserBlocked(values));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(state?.blocked ? "Tài khoản đã được khóa." : "Tài khoản đã được mở khóa.");
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
            <span
              className={
                state.blocked
                  ? "bg-destructive/10 text-destructive flex size-9 items-center justify-center rounded-lg"
                  : "bg-success/10 text-success flex size-9 items-center justify-center rounded-lg"
              }
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>{state.blocked ? "Khóa tài khoản" : "Mở khóa tài khoản"}</DialogTitle>
          </div>
          <DialogDescription>
            {state.blocked
              ? `“${name}” sẽ không thể tiếp tục đăng nhập sau khi trạng thái Auth được cập nhật.`
              : `Khôi phục quyền đăng nhập cho “${name}”.`}{" "}
            Thao tác này được ghi vào audit log.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="account-status-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{state.blocked ? "Lý do khóa" : "Lý do mở khóa"}</FormLabel>
                  <FormControl>
                    <Textarea
                      autoFocus
                      className="min-h-28 resize-y"
                      maxLength={500}
                      placeholder={
                        state.blocked
                          ? "Ví dụ: Phát hiện hoạt động vi phạm điều khoản..."
                          : "Ví dụ: Đã xác minh và xử lý yêu cầu hỗ trợ..."
                      }
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
            form="account-status-form"
            variant={state.blocked ? "destructive" : "success"}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <Icon aria-hidden="true" />
            )}
            {state.blocked ? "Xác nhận khóa" : "Xác nhận mở khóa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
