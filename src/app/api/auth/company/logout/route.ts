import { NextResponse } from 'next/server';
import { adminAuthConfig } from '@/lib/auth/admin/config';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logout exitoso'
  });
  
  // Eliminar la cookie de autenticación de admin
  response.cookies.set(adminAuthConfig.cookieName, '', {
    expires: new Date(0),
    path: adminAuthConfig.cookiePath,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: adminAuthConfig.sameSite as 'strict' | 'lax' | 'none',
  });
  
  return response;
}
