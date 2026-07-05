"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addOrReplaceCartItem,
  readCartFromStorage,
  removeCartItemByBeatId,
  writeCartToStorage,
} from "@/lib/cart/storage";
import type { CartLineItem } from "@/lib/cart/types";

type CartContextValue = {
  items: CartLineItem[];
  itemCount: number;
  addItem: (item: CartLineItem) => void;
  removeItem: (beatId: string) => void;
  clearCart: () => void;
  isHydrated: boolean;
  isAuthenticated: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  children,
  isAuthenticated = false,
}: {
  children: React.ReactNode;
  isAuthenticated?: boolean;
}) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([]);
      setIsHydrated(true);
      return;
    }

    setItems(readCartFromStorage().items);
    setIsHydrated(true);
  }, [isAuthenticated]);

  const addItem = useCallback(
    (item: CartLineItem) => {
      if (!isAuthenticated) return;

      setItems((current) => {
        const next = addOrReplaceCartItem(current, item);
        writeCartToStorage({ items: next });
        return next;
      });
    },
    [isAuthenticated],
  );

  const removeItem = useCallback(
    (beatId: string) => {
      if (!isAuthenticated) return;

      setItems((current) => {
        const next = removeCartItemByBeatId(current, beatId);
        writeCartToStorage({ items: next });
        return next;
      });
    },
    [isAuthenticated],
  );

  const clearCart = useCallback(() => {
    if (!isAuthenticated) return;

    setItems(() => {
      writeCartToStorage({ items: [] });
      return [];
    });
  }, [isAuthenticated]);

  const value = useMemo(
    () => ({
      items,
      itemCount: isAuthenticated ? items.length : 0,
      addItem,
      removeItem,
      clearCart,
      isHydrated,
      isAuthenticated,
    }),
    [
      items,
      addItem,
      removeItem,
      clearCart,
      isHydrated,
      isAuthenticated,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}

/** Fallback safe pour composants pouvant être hors provider (ne pas utiliser en prod normale). */
export function useCartSafe() {
  const context = useContext(CartContext);
  return (
    context ?? {
      items: [],
      itemCount: 0,
      addItem: () => {},
      removeItem: () => {},
      clearCart: () => {},
      isHydrated: true,
      isAuthenticated: false,
    }
  );
}
