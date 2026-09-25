import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySuperAdminJWT } from '@/lib/auth/superadmin/jwt';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';
import { verifyOrganizationJWT } from '@/lib/auth/organization/jwt';
import { organizationAuthConfig } from '@/lib/auth/organization/config';
import { prisma } from '@/lib/prisma';

/**
 * Who is signed in to the panel: a platform account or an organization one. Each
 * has its own session, and a token of one kind never passes for the other.
 */
export async function GET() {
  try {
    const cookieStore = await cookies();

    const superToken = cookieStore.get(superadminAuthConfig.cookieName)?.value;
    if (superToken) {
      const payload = await verifySuperAdminJWT(superToken);
      if (payload) {
        return NextResponse.json({
          user: { id: payload.id, email: payload.email, name: payload.name, role: payload.role },
        });
      }
    }

    const organizationToken = cookieStore.get(organizationAuthConfig.cookieName)?.value;
    if (organizationToken) {
      const payload = await verifyOrganizationJWT(organizationToken);
      if (payload) {
        const organization = await prisma.organization.findUnique({
          where: { id: payload.organizationId! },
          select: { name: true },
        });
        return NextResponse.json({
          user: {
            id: payload.id,
            email: payload.email,
            name: payload.name,
            role: payload.role,
            organizationName: organization?.name ?? null,
          },
        });
      }
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ user: null });
  }
}
