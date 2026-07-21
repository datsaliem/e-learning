/** "799000" -> "799.000đ". */
export function formatCurrencyVND(amount: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(amount)}đ`;
}

/** "6100" -> "6.1k", "128" -> "128" — dùng cho số liệu thống kê (học viên, đánh giá...). */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${trimTrailingZero(value / 1_000_000)}Tr`;
  }
  if (value >= 1_000) {
    return `${trimTrailingZero(value / 1_000)}k`;
  }
  return String(value);
}

function trimTrailingZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}
