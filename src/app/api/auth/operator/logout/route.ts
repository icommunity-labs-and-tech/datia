import { NextResponse } from 'next/server';
import { operatorAuthConfig } from '@/lib/auth/operator/config';

export async function POST() {
  const response = NextResponse.json({ 
    success: true,
    message: 'Logout exitoso'
  });
  
  // Eliminar la cookie de autenticación de operator
  response.cookies.set(operatorAuthConfig.cookieName, '', {
    expires: new Date(0),
    path: operatorAuthConfig.cookiePath,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: operatorAuthConfig.sameSite as 'strict' | 'lax' | 'none',
  });
  
  return response;
}
