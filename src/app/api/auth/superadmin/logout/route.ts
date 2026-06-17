import { NextResponse } from 'next/server';
import { superadminAuthConfig } from '@/lib/auth/superadmin/config';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Eliminar la cookie
  response.cookies.delete(superadminAuthConfig.cookieName);
  
  return response;
}





