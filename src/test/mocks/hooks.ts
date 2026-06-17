import { vi } from 'vitest';

// Mock para hooks personalizados
vi.mock('@/hooks/useAuthSeparated', () => ({
  useAuthSeparated: vi.fn(() => ({
    user: null,
    loading: false,
    isAdmin: false,
    isOperator: false
  }))
}));


