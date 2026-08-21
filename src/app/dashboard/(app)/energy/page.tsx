import { redirect } from 'next/navigation';

/**
 * The energy views used to be tabs of a single hub. They are routes of their
 * own now, so this entry point — and any ?tab= link still in circulation —
 * forwards to the matching view.
 */
export default async function EnergyIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;

  if (tab === 'consumption') redirect('/dashboard/energy/consumption');
  if (tab === 'emissions') redirect('/dashboard/energy/emissions');
  redirect('/dashboard/energy/sources');
}
