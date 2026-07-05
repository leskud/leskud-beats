import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { getUser } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <html lang="fr" className={`${inter.variable} ${barlowCondensed.variable} h-full`}>
      <body className="flex min-h-full flex-col antialiased">
        <AppShell isAuthenticated={Boolean(user)}>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AppShell>
      </body>
    </html>
  );
}
