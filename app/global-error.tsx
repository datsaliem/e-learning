"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server failures are logged by instrumentation.ts. Keep the browser log
    // intentionally minimal so it does not expose messages or user data.
    console.error(
      JSON.stringify({
        level: "error",
        event: "global_client_error",
        digest: error.digest ?? null,
      }),
    );
  }, [error.digest]);

  return (
    <html lang="vi">
      <body className="bg-background text-foreground grid min-h-dvh place-items-center p-6">
        <main className="bg-card w-full max-w-lg rounded-2xl border p-8 text-center shadow-sm">
          <p className="text-muted-foreground text-sm font-medium">E-Learning VN</p>
          <h1 className="mt-3 text-2xl font-semibold">Đã xảy ra lỗi ngoài dự kiến</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Hệ thống đã ghi nhận sự cố. Bạn có thể thử tải lại trang; dữ liệu biểu mẫu chưa gửi có
            thể cần nhập lại.
          </p>
          {error.digest ? (
            <p className="text-muted-foreground mt-3 font-mono text-xs">Mã lỗi: {error.digest}</p>
          ) : null}
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground focus-visible:ring-ring mt-6 inline-flex h-10 items-center justify-center rounded-lg px-5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Thử lại
          </button>
        </main>
      </body>
    </html>
  );
}
