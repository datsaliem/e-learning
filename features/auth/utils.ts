/** Chỉ cho phép redirect nội bộ để tránh open-redirect sau đăng nhập. */
export function safeNextPath(value: string | undefined | null): string | null {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return null;
  }

  return value;
}
