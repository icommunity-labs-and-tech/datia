import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@/app/globals.css';
import Providers from '@/components/Providers';
import RootContainer from '@/components/RootContainer';
import CustomerCSS from '@/components/CustomerCSS';
import { appConfig } from '@/config/app';
import { getLocale } from '@/i18n/locale';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: appConfig.name,
  description: appConfig.description,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations('accessibility');

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <CustomerCSS />
            <a href="#main" className="visually-hidden-focusable">
              {t('skipToContent')}
            </a>
            <RootContainer>
              {children}
            </RootContainer>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
