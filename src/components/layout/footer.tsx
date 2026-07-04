import Link from "next/link";
import { LeskudLogo } from "@/components/brand/leskud-logo";
import { YoutubeLink } from "@/components/brand/youtube-link";
import { CONTACT_EMAIL, SITE_NAME, YOUTUBE_CHANNEL_URL } from "@/lib/constants";

const footerLinks = [
  { href: "/legal/mentions-legales", label: "Mentions légales" },
  { href: "/legal/cgv", label: "CGV" },
  { href: "/legal/licences", label: "Licences" },
  { href: "/legal/confidentialite", label: "Confidentialité" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-surface/50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-4">
            <LeskudLogo href={null} size="sm" />
            <YoutubeLink href={YOUTUBE_CHANNEL_URL} variant="subtle" />
          </div>

          <nav className="flex flex-wrap gap-x-5 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-gold"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-4 text-xs text-muted">
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="transition-colors hover:text-gold"
          >
            {CONTACT_EMAIL}
          </a>
        </p>

        <p className="mt-4 text-center text-xs text-muted sm:text-left">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
