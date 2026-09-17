import { cookies } from 'next/headers';
import { isLocale, routing } from './routing';

/**
 * Obtiene el locale actual desde las cookies
 * Útil para usar en Server Components
 */
export async function getLocale(): Promise<string> {
  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value;
  
  if (isLocale(locale)) {
    return locale;
  }
  
  return routing.defaultLocale;
}
