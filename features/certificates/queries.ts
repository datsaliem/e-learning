import "server-only";

import { certificateCodeSchema } from "@/features/certificates/schemas";
import type { CertificateData } from "@/features/certificates/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const CERTIFICATE_COLUMNS =
  "certificate_code, student_name, course_title, instructor_name, issued_at, revoked_at, revocation_reason";

interface CertificateRow {
  certificate_code: string;
  student_name: string;
  course_title: string;
  instructor_name: string;
  issued_at: string;
  revoked_at: string | null;
  revocation_reason: string | null;
}

function mapCertificate(row: CertificateRow): CertificateData {
  return {
    certificateCode: row.certificate_code,
    studentName: row.student_name,
    courseTitle: row.course_title,
    instructorName: row.instructor_name,
    issuedAt: row.issued_at,
    revokedAt: row.revoked_at,
    revocationReason: row.revocation_reason,
  };
}

/** RLS giới hạn kết quả cho học viên sở hữu, instructor của khoá học hoặc admin. */
export async function getAccessibleCertificate(code: string): Promise<CertificateData | null> {
  const parsedCode = certificateCodeSchema.safeParse(code);
  if (!parsedCode.success) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("certificates")
    .select(CERTIFICATE_COLUMNS)
    .eq("certificate_code", parsedCode.data)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapCertificate(data as CertificateRow);
}

/**
 * Public verification performs one exact, validated lookup on the trusted
 * server and only returns certificate display snapshots. The certificates
 * table itself remains unavailable to anonymous clients.
 */
export async function getPublicCertificate(code: string): Promise<CertificateData | null> {
  const parsedCode = certificateCodeSchema.safeParse(code);
  if (!parsedCode.success) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("certificates")
    .select(CERTIFICATE_COLUMNS)
    .eq("certificate_code", parsedCode.data)
    .maybeSingle();

  if (error) {
    throw new Error("Certificate verification is temporarily unavailable.");
  }

  if (!data) {
    return null;
  }

  return mapCertificate(data as CertificateRow);
}
