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
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLineItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setItems(readCartFromStorage().items);
    setIsHydrated(true);
  }, []);

  const addItem = useCallback((item: CartLineItem) => {
    setItems((current) => {
      const next = addOrReplaceCartItem(current, item);
      writeCartToStorage({ items: next });
      return next;
    });
  }, []);

  const removeItem = useCallback((beatId: string) => {
    setItems((current) => {
      const next = removeCartItemByBeatId(current, beatId);
      writeCartToStorage({ items: next });
      return next;
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems(() => {
      writeCartToStorage({ items: [] });
      return [];
    });
  }, []);

  const value = useMemo(
    () => ({
      items,
      itemCount: items.length,
      addItem,
      removeItem,
      clearCart,
      isHydrated,
    }),
    [items, addItem, removeItem, clearCart, isHydrated],
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
    }
  );
}
