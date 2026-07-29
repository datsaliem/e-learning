export type TransactionalEmailTemplate =
  | "welcome"
  | "enrollment_confirmation"
  | "payment_receipt"
  | "course_completion"
  | "certificate_issued";

export interface TransactionalEmailTemplateInput {
  template: TransactionalEmailTemplate;
  recipientName: string;
  subject: string;
  payload: Record<string, unknown>;
  appUrl: string;
}

export interface RenderedTransactionalEmail {
  subject: string;
  html: string;
  text: string;
}

interface TemplateContent {
  eyebrow: string;
  heading: string;
  intro: string;
  bodyHtml: string;
  bodyText: string;
  actionLabel: string;
  actionUrl: string;
}

interface ReceiptItem {
  title: string;
  slug: string;
  amount: number;
  quantity: number;
}

const BRAND_NAME = "E-Learning";
const SUPPORT_EMAIL = "support@e-learning.vn";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readString(payload: Record<string, unknown>, key: string, fallback = ""): string {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumber(payload: Record<string, unknown>, key: string, fallback = 0): number {
  const value = payload[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeAppUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("EMAIL_APP_URL must use HTTPS outside localhost.");
  }
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function appLink(appUrl: string, path: string): string {
  const baseUrl = normalizeAppUrl(appUrl);
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return new URL(safePath, baseUrl).toString();
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function formatMoney(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase() || "VND";
  try {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: normalizedCurrency,
      maximumFractionDigits: normalizedCurrency === "VND" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("vi-VN").format(amount)} ${normalizedCurrency}`;
  }
}

function readReceiptItems(payload: Record<string, unknown>): ReceiptItem[] {
  const value = payload.items;
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const title = readString(record, "title");
    if (!title) return [];

    return [
      {
        title,
        slug: readString(record, "slug"),
        amount: Math.max(0, readNumber(record, "amount")),
        quantity: Math.max(1, Math.trunc(readNumber(record, "quantity", 1))),
      },
    ];
  });
}

function detailRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:600;text-align:right;vertical-align:top">${escapeHtml(value)}</td>
    </tr>`;
}

function detailsCard(rows: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px">
      <tr>
        <td style="padding:16px 20px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${rows}
          </table>
        </td>
      </tr>
    </table>`;
}

function welcomeContent(input: TransactionalEmailTemplateInput): TemplateContent {
  return {
    eyebrow: "Tài khoản đã sẵn sàng",
    heading: `Chào mừng ${input.recipientName}!`,
    intro:
      "Rất vui khi bạn gia nhập cộng đồng học tập của E-Learning. Bạn có thể bắt đầu khám phá các khóa học phù hợp ngay hôm nay.",
    bodyHtml: detailsCard(
      detailRow("Tài khoản", "Đã kích hoạt") +
        detailRow("Không gian học tập", "Sẵn sàng") +
        detailRow("Hỗ trợ", SUPPORT_EMAIL),
    ),
    bodyText: "Tài khoản của bạn đã được tạo và không gian học tập đã sẵn sàng.",
    actionLabel: "Khám phá khóa học",
    actionUrl: appLink(input.appUrl, "/courses"),
  };
}

function enrollmentContent(input: TransactionalEmailTemplateInput): TemplateContent {
  const courseTitle = readString(input.payload, "courseTitle", "khóa học của bạn");
  const courseSlug = readString(input.payload, "courseSlug");
  const enrolledAt = formatDate(input.payload.enrolledAt);
  const expiresAt = formatDate(input.payload.expiresAt) || "Không giới hạn";

  return {
    eyebrow: "Ghi danh thành công",
    heading: "Khóa học đã có trong tài khoản",
    intro: `Bạn đã ghi danh thành công vào “${courseTitle}”. Hãy tiếp tục khi bạn sẵn sàng — tiến độ sẽ được lưu tự động.`,
    bodyHtml: detailsCard(
      detailRow("Khóa học", courseTitle) +
        (enrolledAt ? detailRow("Ngày ghi danh", enrolledAt) : "") +
        detailRow("Thời hạn", expiresAt),
    ),
    bodyText: `Khóa học: ${courseTitle}\nNgày ghi danh: ${enrolledAt || "Vừa xong"}\nThời hạn: ${expiresAt}`,
    actionLabel: "Bắt đầu học",
    actionUrl: courseSlug
      ? appLink(input.appUrl, `/courses/${pathSegment(courseSlug)}`)
      : appLink(input.appUrl, "/my-courses"),
  };
}

function paymentContent(input: TransactionalEmailTemplateInput): TemplateContent {
  const orderId = readString(input.payload, "orderId");
  const currency = readString(input.payload, "currency", "vnd");
  const totalAmount = Math.max(0, readNumber(input.payload, "amount"));
  const paidAt = formatDate(input.payload.paidAt);
  const items = readReceiptItems(input.payload);

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px">
            ${escapeHtml(item.title)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:14px;text-align:right;white-space:nowrap">
            ${escapeHtml(formatMoney(item.amount * item.quantity, currency))}
          </td>
        </tr>`,
    )
    .join("");

  const receiptHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px">
      <tr>
        <td style="padding:18px 20px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${itemRows}
            <tr>
              <td style="padding:14px 0 2px;color:#0f172a;font-size:15px;font-weight:700">Tổng thanh toán</td>
              <td style="padding:14px 0 2px;color:#4f46e5;font-size:17px;font-weight:800;text-align:right;white-space:nowrap">
                ${escapeHtml(formatMoney(totalAmount, currency))}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const itemText = items.length
    ? items
        .map((item) => `- ${item.title}: ${formatMoney(item.amount * item.quantity, currency)}`)
        .join("\n")
    : "- Các khóa học trong đơn hàng";

  return {
    eyebrow: "Thanh toán thành công",
    heading: "Cảm ơn bạn đã thanh toán",
    intro:
      "Khoản thanh toán đã được xác nhận. Các khóa học trong đơn hiện đã sẵn sàng trong tài khoản của bạn.",
    bodyHtml:
      receiptHtml +
      detailsCard(
        (orderId ? detailRow("Mã đơn hàng", orderId) : "") +
          (paidAt ? detailRow("Thanh toán lúc", paidAt) : ""),
      ),
    bodyText: `${itemText}\nTổng thanh toán: ${formatMoney(totalAmount, currency)}${orderId ? `\nMã đơn hàng: ${orderId}` : ""}${paidAt ? `\nThanh toán lúc: ${paidAt}` : ""}`,
    actionLabel: "Xem khóa học của tôi",
    actionUrl: appLink(input.appUrl, "/my-courses"),
  };
}

function completionContent(input: TransactionalEmailTemplateInput): TemplateContent {
  const courseTitle = readString(input.payload, "courseTitle", "khóa học");
  const completedAt = formatDate(input.payload.completedAt);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(readNumber(input.payload, "progressPercent", 100))),
  );

  return {
    eyebrow: "Cột mốc mới",
    heading: "Chúc mừng bạn đã hoàn thành!",
    intro: `Bạn đã hoàn thành “${courseTitle}”. Sự kiên trì của bạn đã tạo nên một thành tích rất đáng tự hào.`,
    bodyHtml: detailsCard(
      detailRow("Khóa học", courseTitle) +
        detailRow("Tiến độ", `${progressPercent}%`) +
        (completedAt ? detailRow("Hoàn thành lúc", completedAt) : ""),
    ),
    bodyText: `Khóa học: ${courseTitle}\nTiến độ: ${progressPercent}%${completedAt ? `\nHoàn thành lúc: ${completedAt}` : ""}`,
    actionLabel: "Xem thành tích",
    actionUrl: appLink(input.appUrl, "/my-courses"),
  };
}

function certificateContent(input: TransactionalEmailTemplateInput): TemplateContent {
  const certificateCode = readString(input.payload, "certificateCode");
  const courseTitle = readString(input.payload, "courseTitle", "khóa học");
  const instructorName = readString(input.payload, "instructorName", "Giảng viên E-Learning");
  const issuedAt = formatDate(input.payload.issuedAt);

  return {
    eyebrow: "Chứng chỉ đã phát hành",
    heading: "Chứng chỉ của bạn đã sẵn sàng",
    intro: `Chứng chỉ hoàn thành “${courseTitle}” đã được cấp. Bạn có thể xem, xác minh và tải chứng chỉ từ trang bên dưới.`,
    bodyHtml: detailsCard(
      detailRow("Khóa học", courseTitle) +
        detailRow("Giảng viên", instructorName) +
        (certificateCode ? detailRow("Mã chứng chỉ", certificateCode) : "") +
        (issuedAt ? detailRow("Ngày cấp", issuedAt) : ""),
    ),
    bodyText: `Khóa học: ${courseTitle}\nGiảng viên: ${instructorName}${certificateCode ? `\nMã chứng chỉ: ${certificateCode}` : ""}${issuedAt ? `\nNgày cấp: ${issuedAt}` : ""}`,
    actionLabel: "Xem chứng chỉ",
    actionUrl: certificateCode
      ? appLink(input.appUrl, `/certificates/${pathSegment(certificateCode)}`)
      : appLink(input.appUrl, "/certificates/verify"),
  };
}

function contentFor(input: TransactionalEmailTemplateInput): TemplateContent {
  switch (input.template) {
    case "welcome":
      return welcomeContent(input);
    case "enrollment_confirmation":
      return enrollmentContent(input);
    case "payment_receipt":
      return paymentContent(input);
    case "course_completion":
      return completionContent(input);
    case "certificate_issued":
      return certificateContent(input);
  }
}

function renderHtml(input: TransactionalEmailTemplateInput, content: TemplateContent): string {
  const safeSubject = escapeHtml(input.subject);
  const safeEyebrow = escapeHtml(content.eyebrow);
  const safeHeading = escapeHtml(content.heading);
  const safeIntro = escapeHtml(content.intro);
  const safeActionLabel = escapeHtml(content.actionLabel);
  const safeActionUrl = escapeHtml(content.actionUrl);

  return `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;background:#f1f5f9;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${safeSubject}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9">
      <tr>
        <td align="center" style="padding:32px 16px">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
            <tr>
              <td style="padding:0 6px 18px">
                <a href="${escapeHtml(normalizeAppUrl(input.appUrl))}" style="color:#0f172a;font-size:22px;font-weight:800;letter-spacing:-0.4px;text-decoration:none">
                  <span style="color:#4f46e5">E</span>-Learning
                </a>
              </td>
            </tr>
            <tr>
              <td style="overflow:hidden;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;box-shadow:0 8px 30px rgba(15,23,42,0.06)">
                <div style="height:6px;background:linear-gradient(90deg,#4f46e5,#7c3aed,#0ea5e9)"></div>
                <div style="padding:38px 40px 34px">
                  <p style="margin:0 0 12px;color:#4f46e5;font-size:12px;font-weight:800;letter-spacing:1.4px;text-transform:uppercase">${safeEyebrow}</p>
                  <h1 style="margin:0 0 16px;color:#0f172a;font-size:28px;line-height:1.25;letter-spacing:-0.6px">${safeHeading}</h1>
                  <p style="margin:0;color:#475569;font-size:16px;line-height:1.7">${safeIntro}</p>
                  ${content.bodyHtml}
                  <table role="presentation" cellspacing="0" cellpadding="0" style="margin:26px 0 20px">
                    <tr>
                      <td style="background:#4f46e5;border-radius:10px">
                        <a href="${safeActionUrl}" style="display:inline-block;padding:13px 20px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">${safeActionLabel}</a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6">
                    Nếu nút không hoạt động, sao chép liên kết này vào trình duyệt:<br>
                    <a href="${safeActionUrl}" style="color:#4f46e5;word-break:break-all">${safeActionUrl}</a>
                  </p>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 8px 0;color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">
                Email giao dịch tự động từ ${BRAND_NAME}. Bạn nhận được email này do hoạt động trên tài khoản của mình.<br>
                Cần hỗ trợ? <a href="mailto:${SUPPORT_EMAIL}" style="color:#64748b">${SUPPORT_EMAIL}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(input: TransactionalEmailTemplateInput, content: TemplateContent): string {
  return `${BRAND_NAME}

${content.heading}

${content.intro}

${content.bodyText}

${content.actionLabel}: ${content.actionUrl}

---
Email giao dịch tự động từ ${BRAND_NAME}.
Cần hỗ trợ? ${SUPPORT_EMAIL}`;
}

export function renderTransactionalEmail(
  input: TransactionalEmailTemplateInput,
): RenderedTransactionalEmail {
  const normalizedInput = {
    ...input,
    recipientName: input.recipientName.trim() || "Học viên",
    subject: input.subject.trim(),
  };
  const content = contentFor(normalizedInput);

  return {
    subject: normalizedInput.subject,
    html: renderHtml(normalizedInput, content),
    text: renderText(normalizedInput, content),
  };
}
