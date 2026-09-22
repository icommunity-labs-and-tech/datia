import { vi } from 'vitest';

// Mock actions/API calls
vi.mock('@/actions/items', () => ({
  getItem: vi.fn()
}));

// Mock localStorage with real store so get/set round-trips work in tests
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock TanStack Table for future use
vi.mock('@tanstack/react-table', () => ({
  useReactTable: vi.fn(),
  getCoreRowModel: vi.fn(),
  getSortedRowModel: vi.fn(),
  getFilteredRowModel: vi.fn(),
  flexRender: vi.fn((component) => component),
  createColumnHelper: vi.fn(),
}));

// Mock formatters
vi.mock('@/lib/format', () => ({
  formatValueWithSmartDateDetection: vi.fn((val) => `formatted-${val}`)
}));

