import { cookies } from 'next/headers';
import { routing } from './routing';

/**
 * Obtiene el locale actual desde las cookies
 * Útil para usar en Server Components
 */
export async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value;
  
  if (locale && routing.locales.includes(locale as any)) {
    return locale;
  }
  
  return routing.defaultLocale;
}
