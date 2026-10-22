import { redirect } from 'next/navigation';

// The old public lookup portal is gone; assets are reached through their QR.
export default function EnergyPortalRedirect() {
  redirect('/apps');
}
