import '@testing-library/jest-dom';

// Import mocks
import './mocks/hooks';
import './mocks/actions';
// prisma-repositories mock removed - Effect.ts has been eliminated

// jsdom does not implement matchMedia, and Mantine reads it on mount, so any
// component rendered inside a MantineProvider throws without this stub.
// A file that runs in the node environment (`@vitest-environment node`, for
// code that needs node's own Uint8Array, like jose) has no window to stub.
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),    // deprecated, still called by some libs
      removeListener: vi.fn(), // deprecated, still called by some libs
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

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
