import { NextResponse } from 'next/server';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';
import { organizationAuthConfig } from '@/lib/auth/organization/config';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // Cierra la sesión que haya, del panel de plataforma o del de organización.
  response.cookies.delete(superadminAuthConfig.cookieName);
  response.cookies.delete(organizationAuthConfig.cookieName);

  return response;
}
