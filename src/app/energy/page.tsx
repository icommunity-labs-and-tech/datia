import { redirect } from 'next/navigation';

// The asset lookup lives in the public passport entry point now.
export default function EnergyPortalRedirect() {
  redirect('/customer');
}
