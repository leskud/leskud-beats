import { notFound, redirect } from "next/navigation";
import {
  CgvContent,
  ConfidentialiteContent,
  LicencesContent,
  MentionsLegalesContent,
} from "@/components/legal/legal-content";

type Props = { params: Promise<{ slug: string }> };

const METADATA: Record<string, string> = {
  "mentions-legales": "Mentions légales",
  mentions: "Mentions légales",
  cgv: "Conditions Générales de Vente",
  licences: "Licences",
  confidentialite: "Politique de confidentialité",
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: METADATA[slug] ?? "Page légale" };
}

export default async function LegalPage({ params }: Props) {
  const { slug } = await params;

  if (slug === "mentions") {
    redirect("/legal/mentions-legales");
  }

  if (slug === "cgv") {
    return <CgvContent />;
  }

  if (slug === "licences") {
    return <LicencesContent />;
  }

  if (slug === "mentions-legales") {
    return <MentionsLegalesContent />;
  }

  if (slug === "confidentialite") {
    return <ConfidentialiteContent />;
  }

  notFound();
}
