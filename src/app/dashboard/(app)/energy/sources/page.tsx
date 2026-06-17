import { listEnergySources } from '@/actions/energy/list-sources';
import EnergySourcesClient from './EnergySourcesClient';

export const dynamic = 'force-dynamic';

export default async function EnergySourcesPage() {
  const sources = await listEnergySources();
  return <EnergySourcesClient sources={sources} />;
}
