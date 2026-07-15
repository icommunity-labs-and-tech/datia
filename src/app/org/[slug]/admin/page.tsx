import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OrgLoginForm from '../_components/OrgLoginForm';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const org = await prisma.organization.findUnique({
    where: { slug },
    select: { nombre: true },
  });
  return {
    title: org ? `${org.nombre} — Admin` : 'Admin',
  };
}

export default async function OrgAdminLoginPage({ params }: Props) {
  const { slug } = await params;

  const org = await prisma.organization.findUnique({
    where: { slug, activa: true },
    select: { nombre: true, logoUrl: true, brandColorPrimary: true, brandColorSecondary: true },
  });

  if (!org) notFound();

  return (
    <OrgLoginForm
      slug={slug}
      orgName={org.nombre}
      logoUrl={org.logoUrl}
      brandColor={org.brandColorPrimary ?? undefined}
      brandColorSecondary={org.brandColorSecondary ?? undefined}
    />
  );
}
