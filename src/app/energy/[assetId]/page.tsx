import { redirect } from 'next/navigation';

/**
 * The energy report used to live here as a separate public portal. It now sits
 * inside the asset passport, which is where the printed QR codes point, so this
 * route only forwards old links and bookmarks.
 */
export default async function EnergyReportRedirect({
  params,
}: {
  params: Promise<{ assetId: string }>;
}) {
  const { assetId } = await params;
  redirect(`/customer/asset/${encodeURIComponent(assetId)}`);
}
