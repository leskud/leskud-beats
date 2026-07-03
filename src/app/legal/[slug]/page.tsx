import { notFound } from "next/navigation";
import { CgvContent, LicencesContent } from "@/components/legal/legal-content";
import { PlaceholderPage } from "@/components/ui/placeholder-page";

type Props = { params: Promise<{ slug: string }> };

const METADATA: Record<string, string> = {
  mentions: "Mentions légales",
  cgv: "Conditions générales de vente",
  licences: "Licences",
  confidentialite: "Politique de confidentialité",
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: METADATA[slug] ?? "Page légale" };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;

  if (slug === "cgv") {
    return <CgvContent />;
  }

  if (slug === "licences") {
    return <LicencesContent />;
  }

  if (slug === "mentions" || slug === "confidentialite") {
    return (
      <PlaceholderPage
        title={METADATA[slug] ?? "Page légale"}
        description="Contenu juridique à compléter — placeholder propre pour la v1."
      />
    );
  }

  notFound();
}
