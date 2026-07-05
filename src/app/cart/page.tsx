import Link from "next/link";
import { CartPageClient } from "@/components/cart/cart-page-client";
import { Button } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Panier",
};

function CartLoginRequired() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">Panier</h1>
      <p className="mt-4 text-muted">
        Connecte-toi pour accéder à ton panier.
      </p>
      <Link href="/login?next=%2Fcart" className="mt-8 inline-block">
        <Button variant="primary">Se connecter</Button>
      </Link>
    </div>
  );
}

export default async function CartPage() {
  const user = await getUser();

  if (!user) {
    return <CartLoginRequired />;
  }

  return <CartPageClient userEmail={user.email ?? ""} />;
}
