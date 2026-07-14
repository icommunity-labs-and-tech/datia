import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { routing } from './i18n/routing';

// Configuración hardcodeada para evitar problemas con process.env en Edge Runtime
const ADMIN_JWT_SECRET = process.env.DASHBOARD_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-secret';
const OPERATOR_JWT_SECRET = process.env.OPERATOR_JWT_SECRET || process.env.JWT_SECRET || 'fallback-operator-secret';

// Función para detectar el idioma preferido
function getLocale(request: NextRequest): string {
  // 1. Verificar cookie de preferencia guardada
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale && routing.locales.includes(cookieLocale as any)) {
    return cookieLocale;
  }

  // 2. Detectar desde Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parsear Accept-Language header (ej: "en-US,en;q=0.9,es;q=0.8")
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, q = '1'] = lang.trim().split(';q=');
        return { locale: locale.split('-')[0], quality: parseFloat(q) };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { locale } of languages) {
      if (routing.locales.includes(locale as any)) {
        return locale;
      }
    }
  }

  // 3. Fallback al idioma por defecto
  return routing.defaultLocale;
}

// Funciones simplificadas para el middleware (sin consultas a BD)
async function verifyAdminJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(ADMIN_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'datia-admin',
      audience: 'datia-dashboard',
    });
    
    if (payload.context !== 'admin' || payload.role !== 'ADMIN') {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

async function verifyOperatorJWT(token: string) {
  try {
    const secret = new TextEncoder().encode(OPERATOR_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'datia-operator',
      audience: 'datia-operator-app',
    });
    
    if (payload.context !== 'operator' || payload.role !== 'USER') {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Detectar idioma
  const locale = getLocale(request);

  // Rutas públicas que no requieren autenticación
  const publicRoutes = [
    '/auth/admin/login',
    '/auth/operator/login',
    '/auth/activate',
    '/auth/error',
    '/api/auth/admin',
    '/api/auth/operator',
    '/favicon.ico',
    '/_next',
    '/api/webhooks',
    '/api/docs',
    '/api/v1/docs',
    '/customer',
    '/logout',
    '/apps',
    '/org',
    '/energy',
  ];

  // Verificar si la ruta actual es pública
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route)
  );

  // Crear respuesta base
  let response: NextResponse;
  
  if (isPublicRoute) {
    response = NextResponse.next();
  } else {
    // Continuar con la lógica de autenticación existente
    response = await handleAuth(request);
  }

  // Establecer locale en cookie si no existe o es diferente
  const currentLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (currentLocale !== locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      httpOnly: false, // Necesario para que el cliente pueda leerlo
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 año
      path: '/',
    });
  }

  // Establecer header para que next-intl lo pueda leer
  response.headers.set('x-next-intl-locale', locale);

  return response;
}

async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Manejar la ruta raíz - redirigir al selector de aplicaciones
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/apps', request.url));
  }

  // Rutas del dashboard (admin)
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin-auth-token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/auth/admin/login?error=Unauthorized', request.url));
    }

    const user = await verifyAdminJWT(token);
    
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/auth/admin/login?error=AccessDenied', request.url));
    }

    return NextResponse.next();
  }

  // Rutas del operador
  if (pathname.startsWith('/operator')) {
    const token = request.cookies.get('operator-auth-token')?.value;
    
    if (!token) {
      return NextResponse.redirect(new URL('/auth/operator/login?error=Unauthorized', request.url));
    }

    const user = await verifyOperatorJWT(token);
    
    if (!user || user.role !== 'USER') {
      return NextResponse.redirect(new URL('/auth/operator/login?error=AccessDenied', request.url));
    }

    return NextResponse.next();
  }

  // Rutas de autenticación - redirigir si ya está logueado
  if (pathname.startsWith('/auth/admin/')) {
    const token = request.cookies.get('admin-auth-token')?.value;
    
    if (token) {
      const user = await verifyAdminJWT(token);
      if (user && user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    
    return NextResponse.next();
  }

  if (pathname.startsWith('/auth/operator/')) {
    const token = request.cookies.get('operator-auth-token')?.value;
    
    if (token) {
      const user = await verifyOperatorJWT(token);
      if (user && user.role === 'USER') {
        return NextResponse.redirect(new URL('/operator', request.url));
      }
    }
    
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
