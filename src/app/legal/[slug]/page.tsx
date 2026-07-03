import { PlaceholderPage } from "@/components/ui/placeholder-page";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: slug };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;

  const titles: Record<string, string> = {
    mentions: "Mentions légales",
    cgv: "Conditions générales de vente",
    confidentialite: "Politique de confidentialité",
  };

  return (
    <PlaceholderPage
      title={titles[slug] ?? "Page légale"}
      description="Contenu juridique à rédiger — placeholder propre pour la v1."
    />
  );
}
