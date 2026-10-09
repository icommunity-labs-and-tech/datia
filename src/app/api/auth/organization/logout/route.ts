import { NextResponse } from 'next/server';
import { organizationAuthConfig } from '@/lib/auth/organization/config';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(organizationAuthConfig.cookieName);
  return response;
}
