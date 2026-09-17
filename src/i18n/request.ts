import { getRequestConfig } from 'next-intl/server';
import { headers } from 'next/headers';
import { isLocale, routing } from './routing';

export default getRequestConfig(async () => {
  // Leer locale del header establecido por el middleware
  const headersList = await headers();
  let locale = headersList.get('x-next-intl-locale') || routing.defaultLocale;

  // También verificar cookie como fallback
  if (!isLocale(locale)) {
    // Intentar leer de cookie directamente (para casos donde el header no esté disponible)
    locale = routing.defaultLocale;
  }

  // Ensure that a valid locale is used
  if (!isLocale(locale)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default
  };
});
