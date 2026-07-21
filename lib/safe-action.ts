/**
 * Bọc lời gọi Server Action từ Client Component. fetch tới action endpoint
 * có thể tự thất bại (mất mạng, dev server restart giữa chừng, timeout) —
 * khác với lỗi nghiệp vụ mà action trả về dạng { error }. Không bọc thì
 * exception này lọt ra ngoài startTransition và làm crash UI ("Failed to
 * fetch"). Luôn dùng hàm này thay vì await action() trực tiếp trong form.
 */
export async function safeAction<T>(
  action: () => Promise<T>,
  fallbackError = "Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.",
): Promise<T | { error: string }> {
  try {
    return await action();
  } catch {
    return { error: fallbackError };
  }
}
