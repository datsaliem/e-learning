import "server-only";

import { quizAttemptSchema } from "@/features/certificates/schemas";
import type { QuizAttemptInput } from "@/features/certificates/types";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Trusted integration point for the future server-side quiz grader. Never
 * expose this function directly as a client action: only a grader that has
 * already checked answers may persist a score.
 */
export async function recordGradedQuizAttempt(input: QuizAttemptInput): Promise<string> {
  const parsed = quizAttemptSchema.parse(input);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("quiz_attempts")
    .insert({
      quiz_id: parsed.quizId,
      student_id: parsed.studentId,
      score: parsed.score,
      completed_at: parsed.completedAt ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Không thể lưu kết quả quiz đã chấm.");
  }

  return data.id;
}
