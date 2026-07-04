import type { CartLineItem, CartState } from "@/lib/cart/types";
import { CART_STORAGE_KEY } from "@/lib/cart/types";

function isValidCartItem(item: unknown): item is CartLineItem {
  if (!item || typeof item !== "object") return false;
  const row = item as Record<string, unknown>;
  return (
    typeof row.beatLicenseId === "string" &&
    typeof row.beatId === "string" &&
    typeof row.beatSlug === "string" &&
    typeof row.beatTitle === "string" &&
    typeof row.licenseType === "string" &&
    typeof row.licenseLabel === "string" &&
    typeof row.priceCents === "number" &&
    !Number.isNaN(row.priceCents)
  );
}

export function readCartFromStorage(): CartState {
  if (typeof window === "undefined") return { items: [] };

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return { items: [] };

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [] };
    }

    const items = (parsed as CartState).items;
    if (!Array.isArray(items)) {
      window.localStorage.removeItem(CART_STORAGE_KEY);
      return { items: [] };
    }

    const validItems = items.filter(isValidCartItem);
    if (validItems.length !== items.length) {
      writeCartToStorage({ items: validItems });
    }

    return { items: validItems };
  } catch {
    try {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } catch {
      // ignore
    }
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
