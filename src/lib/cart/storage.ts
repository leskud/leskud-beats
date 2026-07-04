import type { CartLineItem, CartState } from "@/lib/cart/types";
import { CART_STORAGE_KEY } from "@/lib/cart/types";

export function readCartFromStorage(): CartState {
  if (typeof window === "undefined") return { items: [] };

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };

    const parsed = JSON.parse(raw) as CartState;
    if (!Array.isArray(parsed.items)) return { items: [] };

    return {
      items: parsed.items.filter(
        (item) =>
          item &&
          typeof item.beatLicenseId === "string" &&
          typeof item.beatId === "string",
      ),
    };
  } catch {
    return { items: [] };
  }
}

export function writeCartToStorage(state: CartState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
}

export function addOrReplaceCartItem(
  items: CartLineItem[],
  next: CartLineItem,
): CartLineItem[] {
  const withoutBeat = items.filter((item) => item.beatId !== next.beatId);
  return [...withoutBeat, next];
}

export function removeCartItemByBeatId(
  items: CartLineItem[],
  beatId: string,
): CartLineItem[] {
  return items.filter((item) => item.beatId !== beatId);
}

export function getCartTotalCents(items: CartLineItem[]): number {
  return items.reduce((sum, item) => sum + item.priceCents, 0);
}
