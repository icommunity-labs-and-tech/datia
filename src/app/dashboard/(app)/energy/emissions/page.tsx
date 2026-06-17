import { listEmissions } from '@/actions/energy/list-emissions';
import EmissionsClient from './EmissionsClient';

export const dynamic = 'force-dynamic';

export default async function EmissionsPage() {
  const records = await listEmissions();
  return <EmissionsClient records={records} />;
}
