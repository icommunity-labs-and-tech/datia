import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['es', 'en'],

  // Used when no locale matches
  defaultLocale: 'en'
});

export type Locale = (typeof routing.locales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return routing.locales.some((locale) => locale === value);
}

// Lightweight wrapper around Next.js' navigation APIs that considers the
// routing configuration. Only usePathname is actually consumed anywhere in
// this app (Link/redirect/useRouter come from next/link and next/navigation
// directly everywhere else) — the others were dropped as unused (#25).
export const { usePathname } = createNavigation(routing);
