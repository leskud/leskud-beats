import Link from "next/link";
import { PurchaseDownloads } from "@/components/orders/purchase-downloads";
import { getUserOrdersWithItems } from "@/lib/orders/queries";
import { getUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Mes achats",
};

export default async function AccountPage() {
  const user = await getUser();
  const orders = await getUserOrdersWithItems();
  const items = orders.flatMap((order) => order.order_items);

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold">Mes achats</h1>
      {user ? (
        <p className="mt-2 text-muted">
          Connecté en tant que{" "}
          <span className="text-foreground">{user.email}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">
          <Link href="/login?next=/account" className="text-gold hover:underline">
            Connecte-toi
          </Link>{" "}
          pour retrouver tes achats liés à ton email.
        </p>
      )}

      <div className="mt-8">
        <PurchaseDownloads items={items} />
      </div>
    </div>
  );
}
