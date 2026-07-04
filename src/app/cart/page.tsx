import { CartPageClient } from "@/components/cart/cart-page-client";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Panier",
};

export default async function CartPage() {
  const user = await getUser();

  return <CartPageClient userEmail={user?.email} />;
}
