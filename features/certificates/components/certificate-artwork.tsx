import { AwardIcon, ShieldCheckIcon, ShieldXIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { CertificateData } from "@/features/certificates/types";
import { cn } from "@/lib/utils";

function formatIssuedDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export function CertificateArtwork({
  certificate,
  className,
}: {
  certificate: CertificateData;
  className?: string;
}) {
  const isValid = certificate.revokedAt === null;

  return (
    <article
      aria-label={`Chứng chỉ hoàn thành khóa học ${certificate.courseTitle}`}
      className={cn(
        "from-background via-background to-primary/5 relative isolate overflow-hidden rounded-3xl border bg-gradient-to-br px-5 py-8 shadow-sm sm:px-10 sm:py-12 lg:px-16",
        className,
      )}
    >
      <div
        className="bg-primary/10 absolute -top-24 -left-24 -z-10 size-64 rounded-full blur-2xl"
        aria-hidden="true"
      />
      <div
        className="bg-success/10 absolute -right-24 -bottom-24 -z-10 size-64 rounded-full blur-2xl"
        aria-hidden="true"
      />
      <div className="border-primary/20 pointer-events-none absolute inset-3 rounded-2xl border" />

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="bg-primary text-primary-foreground mb-3 flex size-12 items-center justify-center rounded-full shadow-sm">
          <AwardIcon className="size-6" aria-hidden="true" />
        </div>
        <p className="text-primary text-xs font-semibold tracking-[0.22em]">E-LEARNING</p>
        <h1 className="mt-7 text-2xl font-semibold tracking-tight sm:text-4xl">
          Chứng chỉ hoàn thành
        </h1>
        <p className="text-muted-foreground mt-4 text-sm">Trân trọng chứng nhận</p>

        <p className="text-primary mt-3 text-2xl font-semibold sm:text-4xl">
          {certificate.studentName}
        </p>
        <div className="bg-success mt-4 h-0.5 w-40 rounded-full" aria-hidden="true" />

        <p className="text-muted-foreground mt-6 text-sm">đã hoàn thành khóa học</p>
        <h2 className="mt-2 max-w-2xl text-xl font-semibold text-balance sm:text-3xl">
          {certificate.courseTitle}
        </h2>

        <dl className="mt-9 grid w-full max-w-xl grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Giảng viên
            </dt>
            <dd className="mt-1 font-medium">{certificate.instructorName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Ngày cấp
            </dt>
            <dd className="mt-1 font-medium">
              <time dateTime={certificate.issuedAt}>{formatIssuedDate(certificate.issuedAt)}</time>
            </dd>
          </div>
        </dl>

        <div className="mt-8 flex flex-col items-center gap-2">
          <Badge variant={isValid ? "success" : "destructive"}>
            {isValid ? (
              <ShieldCheckIcon data-icon="inline-start" aria-hidden="true" />
            ) : (
              <ShieldXIcon data-icon="inline-start" aria-hidden="true" />
            )}
            {isValid ? "Chứng chỉ hợp lệ" : "Chứng chỉ đã bị thu hồi"}
          </Badge>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Mã xác thực
          </p>
          <code className="bg-muted rounded-md px-3 py-1.5 text-xs font-semibold break-all sm:text-sm">
            {certificate.certificateCode}
          </code>
        </div>

        {!isValid && certificate.revocationReason && (
          <p className="text-destructive mt-4 max-w-xl text-sm">
            Lý do thu hồi: {certificate.revocationReason}
          </p>
        )}
      </div>
    </article>
  );
}
