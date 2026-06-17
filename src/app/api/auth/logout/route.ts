import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  const cookieStore = await cookies();
  
  // Eliminar la cookie de autenticación
  cookieStore.delete('auth-token');
  
  return NextResponse.json({ success: true });
}
