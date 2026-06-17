import OrganizationDetailPanel from '@/components/views/OrganizationDetailPanel';

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div>
      <OrganizationDetailPanel organizationId={id} />
    </div>
  );
}

