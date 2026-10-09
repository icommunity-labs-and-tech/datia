import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyOrganizationJWT } from '@/lib/auth/organization/jwt';
import { organizationAuthConfig } from '@/lib/auth/organization/config';
import { prisma } from '@/lib/prisma';

/** Who is signed in to the organization's own panel (#20). */
export async function GET() {
  try {
    const token = (await cookies()).get(organizationAuthConfig.cookieName)?.value;
    if (!token) return NextResponse.json({ user: null });

    const payload = await verifyOrganizationJWT(token);
    if (!payload) return NextResponse.json({ user: null });

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
  } catch (error) {
    console.error('[organization/session] error:', error);
    return NextResponse.json({ user: null });
  }
}
