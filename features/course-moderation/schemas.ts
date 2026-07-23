import { z } from "zod";

export const moderationActionSchema = z
  .object({
    courseId: z.string().uuid("Mã khóa học không hợp lệ."),
    decision: z.enum(["approve", "request_changes", "reject"]),
    reason: z.string().trim().max(2000, "Lý do không được vượt quá 2.000 ký tự.").optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === "approve") return;

    if (!value.reason || value.reason.length < 10) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Vui lòng nhập lý do ít nhất 10 ký tự.",
      });
    }
  });

export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
