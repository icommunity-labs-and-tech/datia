import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { isLocale, routing } from './i18n/routing';
import { getAdminJwtSecret } from './lib/auth/admin/config';

function getLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage
      .split(',')
      .map(lang => {
        const [locale, q = '1'] = lang.trim().split(';q=');
        return { locale: locale.split('-')[0], quality: parseFloat(q) };
      })
      .sort((a, b) => b.quality - a.quality);

    for (const { locale } of languages) {
      if (isLocale(locale)) {
        return locale;
      }
    }
  }

  return routing.defaultLocale;
}

async function verifyAdminJWT(token: string) {
  try {
    // Throws in production without a secret; the catch below then denies the session.
    const secret = new TextEncoder().encode(getAdminJwtSecret());
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

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const locale = getLocale(request);

  const publicRoutes = [
    '/auth/admin/login',
    '/auth/activate',
    '/auth/error',
    '/api/auth/admin',
    '/favicon.ico',
    '/_next',
    '/api/docs',
    '/api/v1/docs',
    '/customer',
    '/logout',
    '/apps',
    '/org',
    '/energy',
  ];

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route)
  );

  let response: NextResponse;

  if (isPublicRoute) {
    response = NextResponse.next();
  } else {
    response = await handleAuth(request);
  }

  const currentLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (currentLocale !== locale) {
    response.cookies.set('NEXT_LOCALE', locale, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    });
  }

  response.headers.set('x-next-intl-locale', locale);

  return response;
}

async function handleAuth(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/apps', request.url));
  }

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
