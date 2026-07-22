import { redirect } from 'next/navigation';

export default function EnergyConsumptionPage() {
  redirect('/dashboard/energy?tab=consumption');
}
