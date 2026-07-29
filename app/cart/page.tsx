import type { Metadata } from "next";

import { CartPageView } from "@/features/cart/components/cart-page-view";

export const metadata: Metadata = {
  title: "Giỏ hàng",
  description: "Xem các khoá học đã chọn và tổng giá trị giỏ hàng.",
};

export default function CartPage() {
  return <CartPageView />;
}
