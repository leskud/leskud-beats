import { getPublishedBeats } from "@/lib/beats/queries";
import { CatalogueSection } from "@/components/beats/catalogue-section";

export default async function HomePage() {
  const beats = await getPublishedBeats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CatalogueSection beats={beats} />
    </div>
  );
}
