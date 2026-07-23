import { z } from "zod";

export const certificateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^EL-(?:[A-F0-9]{4}-){5}[A-F0-9]{4}$/,
    "Mã chứng chỉ phải có dạng EL-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX.",
  );

export const quizAttemptSchema = z.object({
  quizId: z.uuid(),
  studentId: z.uuid(),
  score: z.number().int().min(0).max(100),
  completedAt: z.iso.datetime().optional(),
});
