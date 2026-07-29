import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon, ExternalLinkIcon, LibraryIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CertificateArtwork } from "@/features/certificates/components/certificate-artwork";
import { getAccessibleCertificate } from "@/features/certificates/queries";
import { requireUser } from "@/features/auth/queries";

export const metadata: Metadata = {
  title: "Chứng chỉ",
  description: "Chứng chỉ hoàn thành khóa học trên E-Learning.",
};

export default async function CertificatePage({ params }: { params: Promise<{ code: string }> }) {
  await requireUser();
  const { code } = await params;
  const certificate = await getAccessibleCertificate(code);

  if (!certificate) {
    notFound();
  }

  const encodedCode = encodeURIComponent(certificate.certificateCode);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-primary text-sm font-medium">Thành tích học tập</p>
          <h1 className="text-2xl font-semibold tracking-tight">Chứng chỉ của bạn</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/my-courses" />}>
            <LibraryIcon data-icon="inline-start" aria-hidden="true" />
            Khóa học của tôi
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href={`/certificates/verify/${encodedCode}`} />}
          >
            <ExternalLinkIcon data-icon="inline-start" aria-hidden="true" />
            Xác minh công khai
          </Button>
          {!certificate.revokedAt && (
            <Button
              nativeButton={false}
              render={<a href={`/api/certificates/${encodedCode}/pdf`} />}
            >
              <DownloadIcon data-icon="inline-start" aria-hidden="true" />
              Tải PDF
            </Button>
          )}
        </div>
      </div>

      <CertificateArtwork certificate={certificate} />
    </div>
  );
}
