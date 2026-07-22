import '@testing-library/jest-dom';

// Import mocks
import './mocks/hooks';
import './mocks/actions';
// prisma-repositories mock removed - Effect.ts has been eliminated

// Mock CSS imports
vi.mock('../components/Box.css', () => ({}));
vi.mock('../components/charts/KpiGroup.css', () => ({}));

// Stub for Next.js server-only module to avoid resolution errors in vitest
vi.mock('server-only', () => ({}));

// Mock next-intl globally — returns key path as string so tests don't need a Provider
vi.mock('next-intl', () => ({
  useTranslations: (_ns?: string) => (key: string) => key,
  useLocale: () => 'es',
  useMessages: () => ({}),
  NextIntlClientProvider: ({ children }: any) => children,
}));

// Mock Next.js modules that are not available in test environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Headers()),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn(),
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';
process.env.IBS_TOKEN = 'test-token';

// Global fetch mock
global.fetch = vi.fn();

// Mock iCommunity client by default to avoid real prisma and network in route tests
vi.mock('@/lib/icommunity', () => ({
  applySignatureStatusFromWebhook: vi.fn(async () => {}),
  applyEvidenceCertifiedWebhook: vi.fn(async () => {}),
}));

// Console error suppression for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
