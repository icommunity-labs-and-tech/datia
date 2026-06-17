import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { routing } from './routing';

export default getRequestConfig(async () => {
  // Leer locale del header establecido por el middleware
  const headersList = await headers();
  let locale = headersList.get('x-next-intl-locale') || routing.defaultLocale;

  // También verificar cookie como fallback
  if (!locale || !routing.locales.includes(locale as any)) {
    // Intentar leer de cookie directamente (para casos donde el header no esté disponible)
    locale = routing.defaultLocale;
  }

  // Ensure that a valid locale is used
  if (!routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
