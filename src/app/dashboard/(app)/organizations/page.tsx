import { Metadata } from 'next';
import OrganizationsPanel from '@/components/views/OrganizationsPanel';

export const metadata: Metadata = {
  title: 'Organizaciones | Super Admin',
  description: 'Gestiona organizaciones del sistema',
};

export default function OrganizationsPage() {
  return (
    <div className="container-fluid">
      <OrganizationsPanel />
    </div>
  );
}






