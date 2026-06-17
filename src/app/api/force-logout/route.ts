import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logout forced successfully' 
    });

    // Limpiar todas las cookies de NextAuth
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.callback-url');
    response.cookies.delete('next-auth.csrf-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.callback-url');
    response.cookies.delete('__Secure-next-auth.csrf-token');
    
    // También limpiar cookies de desarrollo
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('next-auth.csrf-token');
    
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
