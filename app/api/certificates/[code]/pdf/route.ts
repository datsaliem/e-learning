import { getCurrentUser } from "@/features/auth/queries";
import { generateCertificatePdf } from "@/features/certificates/pdf";
import { getAccessibleCertificate } from "@/features/certificates/queries";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Bạn cần đăng nhập để tải chứng chỉ." }, { status: 401 });
  }

  const { code } = await params;
  const certificate = await getAccessibleCertificate(code);
  if (!certificate) {
    return Response.json({ error: "Không tìm thấy chứng chỉ." }, { status: 404 });
  }

  if (certificate.revokedAt) {
    return Response.json({ error: "Chứng chỉ này đã bị thu hồi." }, { status: 410 });
  }

  try {
    const verificationUrl = `${env.appUrl.replace(/\/$/, "")}/certificates/verify/${encodeURIComponent(
      certificate.certificateCode,
    )}`;
    const pdfBytes = await generateCertificatePdf(certificate, verificationUrl);
    const pdfBody = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(pdfBody).set(pdfBytes);

    return new Response(pdfBody, {
      status: 200,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="certificate-${certificate.certificateCode}.pdf"`,
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return Response.json({ error: "Không thể tạo PDF lúc này." }, { status: 500 });
  }
}
