import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAdminJWT } from '@/lib/auth/admin/jwt';
import { adminAuthConfig } from '@/lib/auth/admin/config';
import OrganizationSettings from './OrganizationSettings';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminAuthConfig.cookieName)?.value;
  let user: any = null;

  if (token) {
    const payload = await verifyAdminJWT(token);
    if (payload?.id) {
      user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: {
          id: true, name: true, email: true, role: true,
          phone: true, signsWithCertificate: true, notes: true,
          createdAt: true, updatedAt: true, organizationId: true,
          Organization: {
            select: {
              id: true, name: true, slug: true, signatureID: true,
              kycURL: true, verificationStatus: true,
              logoUrl: true, brandColorPrimary: true, brandColorSecondary: true,
            },
          },
        },
      });
    }
  }

  return <OrganizationSettings user={user} />;
}
