import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { LeskudLogo } from "@/components/brand/leskud-logo";
import { YoutubeLink } from "@/components/brand/youtube-link";
import { YOUTUBE_CHANNEL_URL } from "@/lib/constants";
import { getProfile, getUser } from "@/lib/supabase/server";

const navLinks = [
  { href: "/#catalogue", label: "Catalogue" },
  { href: "/account", label: "Mes achats" },
];

export async function Header() {
  const user = await getUser();
  const profile = user ? await getProfile() : null;

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <LeskudLogo size="md" shimmer />

        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <YoutubeLink href={YOUTUBE_CHANNEL_URL} />
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <YoutubeLink
            href={YOUTUBE_CHANNEL_URL}
            showLabel={false}
            className="md:hidden"
          />

          <Link
            href="/cart"
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Panier"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>

          {user ? (
            <UserMenu email={user.email ?? ""} isAdmin={profile?.is_admin} />
          ) : (
            <Link
              href="/login"
              className="hidden rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-gold/50 hover:text-gold sm:inline-block"
            >
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
