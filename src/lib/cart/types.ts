import type { PublicCheckoutLicenseType } from "@/lib/constants";

export const CART_STORAGE_KEY = "leskud-cart-v1";

export type CartLineItem = {
  beatLicenseId: string;
  beatId: string;
  beatSlug: string;
  beatTitle: string;
  coverPath: string | null;
  licenseType: PublicCheckoutLicenseType;
  licenseLabel: string;
  priceCents: number;
  filesIncluded: string[];
  addedAt: string;
};

export type CartState = {
  items: CartLineItem[];
};

export type CartCheckoutItem = {
  beatLicenseId: string;
};
