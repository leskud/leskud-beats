import Link from "next/link";
import { LayoutDashboard, LogOut, User } from "lucide-react";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

type UserMenuProps = {
  email: string;
  isAdmin?: boolean;
};

export function UserMenu({ email, isAdmin }: UserMenuProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 text-sm text-muted sm:flex">
        <User className="h-4 w-4" />
        <span className="max-w-[160px] truncate">{email}</span>
      </div>

      {isAdmin && (
        <Link
          href="/admin"
          className="rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-gold"
          aria-label="Administration"
          title="Administration"
        >
          <LayoutDashboard className="h-5 w-5" />
        </Link>
      )}

      <form action={signOut}>
        <Button
          type="submit"
          variant="ghost"
          className="px-2 py-2"
          aria-label="Déconnexion"
          title="Déconnexion"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
}
