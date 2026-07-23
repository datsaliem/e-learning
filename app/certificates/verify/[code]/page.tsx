import type { Metadata } from "next";
import Link from "next/link";
import { SearchIcon, ShieldAlertIcon, ShieldXIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CertificateArtwork } from "@/features/certificates/components/certificate-artwork";
import { getPublicCertificate } from "@/features/certificates/queries";

export const metadata: Metadata = {
  title: "Kết quả xác minh chứng chỉ",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CertificateVerificationResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let verificationUnavailable = false;
  const certificate = await getPublicCertificate(code).catch(() => {
    verificationUnavailable = true;
    return null;
  });

  if (verificationUnavailable) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="bg-warning/10 text-warning mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
              <ShieldAlertIcon className="size-6" aria-hidden="true" />
            </div>
            <CardTitle>Tạm thời chưa thể xác minh</CardTitle>
            <CardDescription>
              Hệ thống đối chiếu đang gián đoạn. Vui lòng thử lại sau ít phút.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/certificates/verify/${encodeURIComponent(code)}`} />}
            >
              Thử lại
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="bg-destructive/10 text-destructive mx-auto mb-3 flex size-12 items-center justify-center rounded-full">
              <ShieldXIcon className="size-6" aria-hidden="true" />
            </div>
            <CardTitle>Không tìm thấy chứng chỉ</CardTitle>
            <CardDescription>
              Mã không đúng, chứng chỉ chưa được phát hành hoặc không còn tồn tại.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/certificates/verify" />}
            >
              <SearchIcon data-icon="inline-start" aria-hidden="true" />
              Thử mã khác
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-primary text-sm font-medium">Kết quả xác minh</p>
          <h1 className="text-2xl font-semibold tracking-tight">Thông tin chứng chỉ</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Dữ liệu được đối chiếu trực tiếp với hệ thống E-Learning.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/certificates/verify" />}
        >
          <SearchIcon data-icon="inline-start" aria-hidden="true" />
          Xác minh mã khác
        </Button>
      </div>

      <CertificateArtwork certificate={certificate} />
    </div>
  );
}
