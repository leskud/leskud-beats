import { notFound } from "next/navigation";
import { LicenseCertificate } from "@/components/licenses/license-certificate";
import {
  getEntitledFileTypes,
  DOWNLOAD_FILE_LABELS,
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
    notFound();
  }

  const beatLicensesMap = await loadBeatLicensesForItems([
    result.data.orderItem.beat_id,
  ]);
  const beatLicenses =
    beatLicensesMap.get(result.data.orderItem.beat_id) ?? [];
  const entitled = getEntitledFileTypes(
    result.data.orderItem.license_type as LicenseType,
    beatLicenses,
  );
  const files = entitled.map((fileType) => ({
    fileType,
    label: DOWNLOAD_FILE_LABELS[fileType],
  }));

  return (
    <LicenseCertificate
      data={result.data}
      files={files}
      sessionId={sessionId ?? null}
    />
  );
}
