export interface CartCourse {
  id: string;
  slug: string;
  title: string;
  categorySlug: string;
  categoryLabel: string;
  thumbnailUrl: string | null;
  /** Giá hiện tại học viên phải trả, đơn vị VNĐ. */
  price: number;
  /** Giá niêm yết trước khuyến mãi, nếu có. */
  originalPrice?: number;
}

export interface CartTotals {
  subtotal: number;
  discount: number;
  total: number;
}

export interface CartSyncResult {
  items: CartCourse[];
  skippedOwned: number;
  skippedUnavailable: number;
}

export type CartMutationCode = "unauthenticated" | "already_owned" | "duplicate" | "unavailable";

export type CartActionResult<T> = { data: T } | { error: string; code?: CartMutationCode };
