"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_link: "Liên kết không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.",
};

const SUCCESS_MESSAGES: Record<string, string> = {
  success: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.",
};

/** Hiển thị toast dựa trên query param ?error=/?reset= sau khi redirect từ server action hoặc route handler. */
export function AuthStatusToast() {
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const error = searchParams.get("error");
    const reset = searchParams.get("reset");

    if (error && ERROR_MESSAGES[error]) {
      toast.error(ERROR_MESSAGES[error]);
    }
    if (reset && SUCCESS_MESSAGES[reset]) {
      toast.success(SUCCESS_MESSAGES[reset]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
