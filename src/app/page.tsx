import { getPublishedBeats } from "@/lib/beats/queries";
import { CatalogueSection } from "@/components/beats/catalogue-section";
import { LicensePricingSection } from "@/components/licenses/license-pricing-section";

export default async function HomePage() {
  const beats = await getPublishedBeats();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CatalogueSection beats={beats} />

      <div className="mt-20 border-t border-border pt-16">
        <LicensePricingSection mode="home" />
      </div>
    </div>
  );
}
