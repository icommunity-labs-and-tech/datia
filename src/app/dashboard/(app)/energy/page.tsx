import { redirect } from 'next/navigation';

export default function EnergyRootPage() {
  redirect('/dashboard/energy/sources');
}
