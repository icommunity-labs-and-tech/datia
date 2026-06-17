import { listEnergyConsumption } from '@/actions/energy/list-consumption';
import EnergyConsumptionClient from './EnergyConsumptionClient';

export const dynamic = 'force-dynamic';

export default async function EnergyConsumptionPage() {
  const records = await listEnergyConsumption();
  return <EnergyConsumptionClient records={records} />;
}
