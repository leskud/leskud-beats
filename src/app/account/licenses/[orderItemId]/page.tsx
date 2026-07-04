import Link from "next/link";
import { notFound } from "next/navigation";
import { LicenseCertificate } from "@/components/licenses/license-certificate";
import {
  getEntitledFileTypes,
  DOWNLOAD_FILE_LABELS,
  type DownloadFileType,
} from "@/lib/orders/download-entitlements";
import {
  getLicenseCertificateData,
  loadBeatLicensesForItems,
} from "@/lib/orders/license-access";
import type { LicenseType } from "@/lib/constants";

export const metadata = {
  title: "Certificat de licence",
};

type Props = {
  params: Promise<{ orderItemId: string }>;
  searchParams: Promise<{ sessionId?: string }>;
};

export default async function LicenseCertificatePage({
  params,
  searchParams,
}: Props) {
  const { orderItemId } = await params;
  const { sessionId } = await searchParams;

  const result = await getLicenseCertificateData(orderItemId, sessionId ?? null);

  if (!result.success) {
    if (result.status === 404) notFound();
    if (result.status === 403) {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Accès refusé</h1>
          <p className="mt-3 text-sm text-muted">
            Tu n&apos;as pas accès à ce certificat de licence.
          </p>
          <Link
            href="/account"
            className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
          >
            Retour à mes achats
          </Link>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Licence introuvable</h1>
        <p className="mt-3 text-sm text-muted">
          Ce certificat n&apos;existe pas ou n&apos;est plus disponible.
        </p>
        <Link
          href="/account"
          className="mt-8 inline-block text-sm text-gold underline-offset-2 hover:underline"
        >
          Retour à mes achats
        </Link>
      </div>
    );
  }

  let files: { fileType: DownloadFileType; label: string }[] = [];

  try {
    const beatLicensesMap = await loadBeatLicensesForItems([
      result.data.orderItem.beat_id,
    ]);
    const beatLicenses =
      beatLicensesMap.get(result.data.orderItem.beat_id) ?? [];
    const entitled = getEntitledFileTypes(
      result.data.orderItem.license_type as LicenseType,
      beatLicenses,
    );
    files = entitled.map((fileType) => ({
      fileType,
      label: DOWNLOAD_FILE_LABELS[fileType],
    }));
  } catch (error) {
    console.error("[license-certificate-page] files_load_failed", error);
  }

  return (
    <LicenseCertificate
      data={result.data}
      files={files}
      sessionId={sessionId ?? null}
    />
  );
}
