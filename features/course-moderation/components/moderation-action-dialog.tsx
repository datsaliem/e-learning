"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CircleCheckIcon, Loader2Icon, MessageSquareWarningIcon, XCircleIcon } from "lucide-react";

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
import { safeAction } from "@/lib/safe-action";
import { moderateCourse } from "@/features/course-moderation/actions";
import {
  moderationActionSchema,
  type ModerationActionInput,
} from "@/features/course-moderation/schemas";
import type {
  ModerationActionResult,
  ModerationCourse,
  ModerationDecision,
} from "@/features/course-moderation/types";

const DECISION_CONFIG = {
  approve: {
    title: "Phê duyệt khóa học",
    description: "Khóa học sẽ được xuất bản ngay và hiển thị trong catalog.",
    submitLabel: "Phê duyệt và xuất bản",
    variant: "success" as const,
    icon: CircleCheckIcon,
  },
  request_changes: {
    title: "Yêu cầu chỉnh sửa",
    description: "Khóa học được trả về cho giảng viên kèm phản hồi cụ thể.",
    submitLabel: "Gửi yêu cầu chỉnh sửa",
    variant: "warning" as const,
    icon: MessageSquareWarningIcon,
  },
  reject: {
    title: "Từ chối khóa học",
    description: "Giảng viên vẫn xem được lý do và có thể chỉnh sửa để gửi lại.",
    submitLabel: "Xác nhận từ chối",
    variant: "destructive" as const,
    icon: XCircleIcon,
  },
};

export interface ModerationDialogState {
  course: ModerationCourse;
  decision: ModerationDecision;
}

export function ModerationActionDialog({
  state,
  onOpenChange,
  onCompleted,
}: {
  state: ModerationDialogState | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: (result: Extract<ModerationActionResult, { data: unknown }>["data"]) => void;
}) {
  const form = useForm<ModerationActionInput>({
    resolver: zodResolver(moderationActionSchema),
    defaultValues: {
      courseId: state?.course.id ?? "",
      decision: state?.decision ?? "approve",
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!state) return;
    form.reset({
      courseId: state.course.id,
      decision: state.decision,
      reason: "",
    });
  }, [form, state]);

  if (!state) return null;

  const config = DECISION_CONFIG[state.decision];
  const DecisionIcon = config.icon;
  const needsReason = state.decision !== "approve";

  async function onSubmit(values: ModerationActionInput) {
    const result = await safeAction(() => moderateCourse(values));
    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast.success(
      state?.decision === "approve"
        ? "Khóa học đã được phê duyệt và xuất bản."
        : "Phản hồi đã được gửi cho giảng viên.",
    );
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
            <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
              <DecisionIcon className="size-5" aria-hidden="true" />
            </span>
            <DialogTitle>{config.title}</DialogTitle>
          </div>
          <DialogDescription>
            {config.description} Bạn đang xử lý “{state.course.title}”.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="moderation-action-form" onSubmit={form.handleSubmit(onSubmit)}>
            {needsReason ? (
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {state.decision === "reject" ? "Lý do từ chối" : "Nội dung cần chỉnh sửa"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        autoFocus
                        className="min-h-32 resize-y"
                        maxLength={2000}
                        placeholder="Nêu rõ nội dung chưa đạt và cách giảng viên có thể khắc phục..."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{field.value?.length ?? 0}/2.000 ký tự</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <div className="bg-success/5 border-success/20 rounded-lg border p-3 text-sm">
                Thời gian xuất bản sẽ được lưu tự động trong lịch sử kiểm duyệt.
              </div>
            )}
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
            form="moderation-action-form"
            variant={config.variant}
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Loader2Icon className="animate-spin" aria-hidden="true" />
            ) : (
              <DecisionIcon aria-hidden="true" />
            )}
            {config.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
