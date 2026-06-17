import { vi } from 'vitest';

export const mockRevalidatePath = vi.fn();
export const mockCookies = vi.fn(() => ({
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
}));
export const mockRedirect = vi.fn();

export const setupNextJsMocks = () => {
  vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
  }));

  vi.mock('next/headers', () => ({
    cookies: mockCookies,
  }));

  vi.mock('next/navigation', () => ({
    redirect: mockRedirect,
  }));
};

export const resetNextJsMocks = () => {
  mockRevalidatePath.mockClear();
  mockCookies.mockClear();
  mockRedirect.mockClear();
};
