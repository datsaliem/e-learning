import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2Icon, Clock3Icon, TriangleAlertIcon } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/features/auth/queries";
import { CheckoutStatusRefresh } from "@/features/checkout/components/checkout-status-refresh";
import { getCheckoutOrderBySessionForUser } from "@/features/checkout/services";
import { formatCurrencyVND } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kết quả thanh toán",
};

const sessionIdSchema = z.string().min(8).max(255);

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: rawSessionId } = await searchParams;
  const parsedSessionId = sessionIdSchema.safeParse(rawSessionId);
  const nextPath = rawSessionId
    ? `/checkout/success?session_id=${encodeURIComponent(rawSessionId)}`
    : "/checkout/success";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const order = parsedSessionId.success
    ? await getCheckoutOrderBySessionForUser(user.id, parsedSessionId.data).catch(() => null)
    : null;

  if (!order) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-16">
        <Card className="w-full text-center">
          <CardHeader>
            <TriangleAlertIcon className="text-warning mx-auto size-12" aria-hidden="true" />
            <CardTitle className="mt-3">Không tìm thấy giao dịch</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            Liên kết không hợp lệ hoặc đơn hàng không thuộc tài khoản hiện tại.
          </CardContent>
          <CardFooter className="justify-center">
            <Button nativeButton={false} render={<Link href="/cart" />}>
              Quay lại giỏ hàng
            </Button>
          </CardFooter>
        </Card>
      </main>
    );
  }

  const paid = order.status === "paid";
  const processing = order.status === "pending" || order.status === "processing";
  const Icon = paid ? CheckCircle2Icon : processing ? Clock3Icon : TriangleAlertIcon;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 items-center px-4 py-12">
      <Card className="w-full">
        <CardHeader className="text-center">
          <Icon
            className={
              paid
                ? "text-success mx-auto size-14"
                : processing
                  ? "text-warning mx-auto size-14"
                  : "text-destructive mx-auto size-14"
            }
            aria-hidden="true"
          />
          <CardTitle className="mt-3 text-2xl">
            {paid
              ? "Thanh toán thành công"
              : processing
                ? "Đang xác nhận thanh toán"
                : "Thanh toán chưa hoàn tất"}
          </CardTitle>
          <div className="flex justify-center">
            <Badge variant={paid ? "success" : processing ? "warning" : "destructive"}>
              {paid ? "Đã thanh toán" : processing ? "Đang xử lý" : "Cần kiểm tra"}
            </Badge>
          </div>
          <CheckoutStatusRefresh active={processing} />
        </CardHeader>

        <CardContent className="grid gap-5">
          <div className="grid gap-3">
            {order.items.map((item) => (
              <div key={item.courseId} className="flex justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">{item.title}</span>
                <span className="shrink-0 font-medium">{formatCurrencyVND(item.unitAmount)}</span>
              </div>
            ))}
          </div>
          <Separator />
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tạm tính</dt>
              <dd>{formatCurrencyVND(order.subtotalAmount)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Giảm giá</dt>
              <dd className={order.discountAmount > 0 ? "text-success" : undefined}>
                {order.discountAmount > 0 ? "−" : ""}
                {formatCurrencyVND(order.discountAmount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-base font-semibold">
              <dt>Tổng cộng</dt>
              <dd>{formatCurrencyVND(order.totalAmount)}</dd>
            </div>
          </dl>
          <p className="text-muted-foreground text-center text-xs">Mã đơn: {order.id}</p>
        </CardContent>

        <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
          {paid ? (
            <Button nativeButton={false} render={<Link href="/my-courses" />}>
              Vào khoá học của tôi
            </Button>
          ) : (
            <Button nativeButton={false} render={<Link href="/cart" />}>
              Quay lại giỏ hàng
            </Button>
          )}
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Về trang chủ
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
