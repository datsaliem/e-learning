"use client";

import * as React from "react";
import { toast } from "sonner";

import { safeAction } from "@/lib/safe-action";
import {
  addCartItem,
  clearCartItems,
  removeCartItem,
  resolveGuestCart,
  syncGuestCart,
} from "@/features/cart/actions";
import type { CartCourse, CartTotals } from "@/features/cart/types";
import { calculateCartTotals } from "@/features/cart/utils";

const GUEST_CART_KEY = "e-learning:guest-cart:v1";
const MAX_CART_ITEMS = 50;
const COURSE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

type AddCourseOutcome = "added" | "duplicate" | "owned" | "error";

interface CartContextValue {
  items: CartCourse[];
  totals: CartTotals;
  count: number;
  isHydrating: boolean;
  isPending: (courseId: string) => boolean;
  isInCart: (courseId: string) => boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  openCart: () => void;
  addCourse: (course: CartCourse) => Promise<AddCourseOutcome>;
  removeCourse: (courseId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
}

const CartContext = React.createContext<CartContextValue | null>(null);

function readGuestCourseIds(): string[] {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(GUEST_CART_KEY) ?? "[]");
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((id): id is string => typeof id === "string"))]
      .filter((id) => COURSE_ID_PATTERN.test(id))
      .slice(0, MAX_CART_ITEMS);
  } catch {
    return [];
  }
}

function writeGuestCart(items: CartCourse[]) {
  window.localStorage.setItem(
    GUEST_CART_KEY,
    JSON.stringify(items.slice(0, MAX_CART_ITEMS).map((item) => item.id)),
  );
}

export function CartProvider({
  userId,
  initialItems,
  children,
}: {
  userId: string | null;
  initialItems: CartCourse[];
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<CartCourse[]>(initialItems);
  const [isHydrating, setIsHydrating] = React.useState(true);
  const [pendingIds, setPendingIds] = React.useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const initialItemsRef = React.useRef(initialItems);

  React.useEffect(() => {
    initialItemsRef.current = initialItems;
  }, [initialItems]);

  React.useEffect(() => {
    let ignore = false;

    async function hydrate() {
      setIsHydrating(true);
      const guestIds = readGuestCourseIds();

      if (userId) {
        if (guestIds.length === 0) {
          if (!ignore) {
            setItems(initialItemsRef.current);
            setIsHydrating(false);
          }
          return;
        }

        const result = await safeAction(() => syncGuestCart(guestIds));
        if (ignore) return;
        if ("error" in result) {
          setItems(initialItemsRef.current);
          setIsHydrating(false);
          toast.error("Chưa thể đồng bộ giỏ hàng trên thiết bị này.");
          return;
        }

        setItems(result.data.items);
        window.localStorage.removeItem(GUEST_CART_KEY);
        setIsHydrating(false);

        const skipped = result.data.skippedOwned + result.data.skippedUnavailable;
        if (skipped > 0) {
          toast.info(`${skipped} khoá học đã sở hữu hoặc ngừng mở bán không được thêm lại.`);
        }
        return;
      }

      if (guestIds.length === 0) {
        if (!ignore) {
          setItems([]);
          setIsHydrating(false);
        }
        return;
      }

      const result = await safeAction(() => resolveGuestCart(guestIds));
      if (ignore) return;
      if ("error" in result) {
        setIsHydrating(false);
        return;
      }

      setItems(result.data);
      writeGuestCart(result.data);
      setIsHydrating(false);
    }

    void hydrate();
    return () => {
      ignore = true;
    };
  }, [userId]);

  function setPending(courseId: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) next.add(courseId);
      else next.delete(courseId);
      return next;
    });
  }

  async function addCourse(course: CartCourse): Promise<AddCourseOutcome> {
    if (items.some((item) => item.id === course.id)) {
      setDrawerOpen(true);
      toast.info("Khoá học đã có trong giỏ.");
      return "duplicate";
    }

    if (items.length >= MAX_CART_ITEMS) {
      toast.error(`Giỏ hàng chỉ chứa tối đa ${MAX_CART_ITEMS} khoá học.`);
      return "error";
    }

    setPending(course.id, true);
    try {
      if (!userId) {
        const next = [...items, course];
        setItems(next);
        writeGuestCart(next);
        setDrawerOpen(true);
        toast.success("Đã thêm khoá học vào giỏ.");
        return "added";
      }

      const result = await safeAction(() => addCartItem(course.id));
      if ("error" in result) {
        if ("code" in result && result.code === "already_owned") {
          toast.info(result.error);
          return "owned";
        }
        toast.error(result.error);
        return "error";
      }

      setItems((current) =>
        current.some((item) => item.id === result.data.item.id)
          ? current
          : [...current, result.data.item],
      );
      setDrawerOpen(true);
      toast[result.data.added ? "success" : "info"](
        result.data.added ? "Đã thêm khoá học vào giỏ." : "Khoá học đã có trong giỏ.",
      );
      return result.data.added ? "added" : "duplicate";
    } finally {
      setPending(course.id, false);
    }
  }

  async function removeCourse(courseId: string): Promise<boolean> {
    const removedItem = items.find((item) => item.id === courseId);
    if (!removedItem) return true;

    const next = items.filter((item) => item.id !== courseId);
    setItems(next);
    setPending(courseId, true);

    try {
      if (!userId) {
        writeGuestCart(next);
        toast.success("Đã xoá khoá học khỏi giỏ.");
        return true;
      }

      const result = await safeAction(() => removeCartItem(courseId));
      if ("error" in result) {
        setItems((current) =>
          current.some((item) => item.id === removedItem.id) ? current : [...current, removedItem],
        );
        toast.error(result.error);
        return false;
      }

      toast.success("Đã xoá khoá học khỏi giỏ.");
      return true;
    } finally {
      setPending(courseId, false);
    }
  }

  async function clearCart(): Promise<boolean> {
    const previous = items;
    setItems([]);

    if (!userId) {
      writeGuestCart([]);
      toast.success("Đã xoá toàn bộ giỏ hàng.");
      return true;
    }

    const result = await safeAction(() => clearCartItems());
    if ("error" in result) {
      setItems(previous);
      toast.error(result.error);
      return false;
    }

    toast.success("Đã xoá toàn bộ giỏ hàng.");
    return true;
  }

  const totals = React.useMemo(() => calculateCartTotals(items), [items]);
  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      totals,
      count: items.length,
      isHydrating,
      isPending: (courseId) => pendingIds.has(courseId),
      isInCart: (courseId) => items.some((item) => item.id === courseId),
      drawerOpen,
      setDrawerOpen,
      openCart: () => setDrawerOpen(true),
      addCourse,
      removeCourse,
      clearCart,
    }),
    // Các hàm thao tác cần closure mới nhất của items/userId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawerOpen, isHydrating, items, pendingIds, totals, userId],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = React.useContext(CartContext);
  if (!context) throw new Error("useCart phải được dùng bên trong CartProvider.");
  return context;
}
