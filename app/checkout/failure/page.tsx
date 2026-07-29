import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CircleXIcon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/features/auth/queries";
import { getCheckoutOrderByIdForUser } from "@/features/checkout/services";

export const metadata: Metadata = {
  title: "Thanh toán chưa hoàn tất",
};

const orderIdSchema = z.string().uuid();

export default async function CheckoutFailurePage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id: rawOrderId } = await searchParams;
  const parsedOrderId = orderIdSchema.safeParse(rawOrderId);
  const nextPath = rawOrderId
    ? `/checkout/failure?order_id=${encodeURIComponent(rawOrderId)}`
    : "/checkout/failure";

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);

  const order = parsedOrderId.success
    ? await getCheckoutOrderByIdForUser(user.id, parsedOrderId.data).catch(() => null)
    : null;

  if (order?.status === "paid" && order.providerCheckoutSessionId) {
    redirect(`/checkout/success?session_id=${encodeURIComponent(order.providerCheckoutSessionId)}`);
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 items-center px-4 py-16">
      <Card className="w-full text-center">
        <CardHeader>
          <CircleXIcon className="text-destructive mx-auto size-14" aria-hidden="true" />
          <CardTitle className="mt-3 text-2xl">Thanh toán chưa hoàn tất</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground grid gap-3">
          <p>
            Giao dịch đã bị huỷ, hết hạn hoặc chưa được cổng thanh toán xác nhận. Bạn chưa bị ghi
            danh thêm khoá học nào từ giao dịch này.
          </p>
          {order && <p className="text-xs">Mã đơn: {order.id}</p>}
        </CardContent>
        <CardFooter className="flex-col gap-3 sm:flex-row sm:justify-center">
          <Button nativeButton={false} render={<Link href="/cart" />}>
            Thử thanh toán lại
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Về trang chủ
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
