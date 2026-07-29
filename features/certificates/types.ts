export interface CertificateData {
  certificateCode: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
}

export interface QuizAttemptInput {
  quizId: string;
  studentId: string;
  score: number;
  completedAt?: string;
}
