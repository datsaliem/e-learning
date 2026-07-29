import "server-only";

import fontkit from "@pdf-lib/fontkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, type PDFFont, rgb } from "pdf-lib";

import type { CertificateData } from "@/features/certificates/types";

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const INK = rgb(0.06, 0.09, 0.16);
const MUTED_INK = rgb(0.3, 0.35, 0.43);
const PRIMARY = rgb(0.15, 0.39, 0.92);
const PRIMARY_DARK = rgb(0.1, 0.24, 0.55);
const ACCENT = rgb(0.05, 0.65, 0.58);
const PAPER = rgb(0.985, 0.99, 1);

let fontBytesPromise: Promise<{ regular: Uint8Array; bold: Uint8Array }> | undefined;

function loadCertificateFonts() {
  fontBytesPromise ??= Promise.all([
    readFile(path.join(process.cwd(), "public/fonts/BeVietnamPro-Regular.ttf")),
    readFile(path.join(process.cwd(), "public/fonts/BeVietnamPro-Bold.ttf")),
  ]).then(([regular, bold]) => ({ regular, bold }));

  return fontBytesPromise;
}

function fitTextSize(
  font: PDFFont,
  text: string,
  preferredSize: number,
  minSize: number,
  maxWidth: number,
) {
  let size = preferredSize;
  while (size > minSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.5;
  }
  return size;
}

function formatIssuedDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

export async function generateCertificatePdf(
  certificate: CertificateData,
  verificationUrl: string,
): Promise<Uint8Array> {
  const { regular, bold } = await loadCertificateFonts();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);

  const [regularFont, boldFont] = await Promise.all([
    pdf.embedFont(regular, { subset: false }),
    pdf.embedFont(bold, { subset: false }),
  ]);

  pdf.setTitle(`Chứng chỉ - ${certificate.courseTitle}`);
  pdf.setAuthor("E-Learning");
  pdf.setSubject(`Chứng chỉ hoàn thành của ${certificate.studentName}`);
  pdf.setKeywords(["e-learning", "certificate", certificate.certificateCode]);
  pdf.setCreationDate(new Date(certificate.issuedAt));
  pdf.setModificationDate(new Date(certificate.issuedAt));

  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const drawCentered = (text: string, y: number, font: PDFFont, size: number, color = INK) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - textWidth) / 2,
      y,
      font,
      size,
      color,
    });
  };

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: PAPER });
  page.drawCircle({ x: 30, y: PAGE_HEIGHT - 30, size: 145, color: rgb(0.91, 0.95, 1) });
  page.drawCircle({ x: PAGE_WIDTH - 22, y: 14, size: 155, color: rgb(0.9, 0.98, 0.97) });
  page.drawRectangle({
    x: 20,
    y: 20,
    width: PAGE_WIDTH - 40,
    height: PAGE_HEIGHT - 40,
    borderColor: PRIMARY_DARK,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 29,
    y: 29,
    width: PAGE_WIDTH - 58,
    height: PAGE_HEIGHT - 58,
    borderColor: rgb(0.73, 0.81, 0.94),
    borderWidth: 0.8,
  });

  page.drawCircle({ x: PAGE_WIDTH / 2, y: 516, size: 23, color: PRIMARY });
  drawCentered("EL", 507.5, boldFont, 15, rgb(1, 1, 1));
  drawCentered("E-LEARNING", 478, boldFont, 11, PRIMARY_DARK);
  drawCentered("CHỨNG CHỈ HOÀN THÀNH", 423, boldFont, 31, INK);
  drawCentered("Trân trọng chứng nhận", 386, regularFont, 12, MUTED_INK);

  const studentSize = fitTextSize(boldFont, certificate.studentName, 31, 20, 680);
  drawCentered(certificate.studentName, 337, boldFont, studentSize, PRIMARY_DARK);
  page.drawRectangle({
    x: 190,
    y: 322,
    width: PAGE_WIDTH - 380,
    height: 1.2,
    color: ACCENT,
  });

  drawCentered("đã hoàn thành khóa học", 292, regularFont, 12, MUTED_INK);
  const courseSize = fitTextSize(boldFont, certificate.courseTitle, 23, 15, 700);
  drawCentered(certificate.courseTitle, 250, boldFont, courseSize, INK);

  const detailY = 181;
  const leftCenter = 280;
  const rightCenter = PAGE_WIDTH - 280;
  const instructorLabel = "GIẢNG VIÊN";
  const dateLabel = "NGÀY CẤP";

  page.drawText(instructorLabel, {
    x: leftCenter - boldFont.widthOfTextAtSize(instructorLabel, 9) / 2,
    y: detailY,
    font: boldFont,
    size: 9,
    color: MUTED_INK,
  });
  const instructorSize = fitTextSize(boldFont, certificate.instructorName, 13, 10, 235);
  page.drawText(certificate.instructorName, {
    x: leftCenter - boldFont.widthOfTextAtSize(certificate.instructorName, instructorSize) / 2,
    y: detailY - 24,
    font: boldFont,
    size: instructorSize,
    color: INK,
  });

  page.drawText(dateLabel, {
    x: rightCenter - boldFont.widthOfTextAtSize(dateLabel, 9) / 2,
    y: detailY,
    font: boldFont,
    size: 9,
    color: MUTED_INK,
  });
  const issuedDate = formatIssuedDate(certificate.issuedAt);
  page.drawText(issuedDate, {
    x: rightCenter - boldFont.widthOfTextAtSize(issuedDate, 13) / 2,
    y: detailY - 24,
    font: boldFont,
    size: 13,
    color: INK,
  });

  page.drawCircle({ x: PAGE_WIDTH / 2, y: 157, size: 33, color: PRIMARY_DARK });
  page.drawCircle({
    x: PAGE_WIDTH / 2,
    y: 157,
    size: 26,
    borderColor: rgb(0.58, 0.76, 1),
    borderWidth: 1.2,
  });
  drawCentered("EL", 149, boldFont, 14, rgb(1, 1, 1));

  drawCentered("MÃ XÁC THỰC", 102, boldFont, 8.5, MUTED_INK);
  drawCentered(certificate.certificateCode, 81, boldFont, 11, PRIMARY_DARK);
  const verificationSize = fitTextSize(regularFont, verificationUrl, 7.5, 6, 700);
  drawCentered(verificationUrl, 59, regularFont, verificationSize, MUTED_INK);

  return pdf.save();
}
