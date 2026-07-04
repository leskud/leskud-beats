"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { cn } from "@/lib/utils";

export function CartHeaderLink({ className }: { className?: string }) {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className={cn(
        "relative rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-foreground",
        className,
      )}
      aria-label={`Panier${isHydrated && itemCount > 0 ? `, ${itemCount} article${itemCount > 1 ? "s" : ""}` : ""}`}
    >
      <ShoppingBag className="h-5 w-5" />
      {isHydrated && itemCount > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-background">
          {itemCount}
        </span>
      ) : null}
    </Link>
  );
}
