import { vi } from 'vitest';

// Mock actions/API calls
vi.mock('@/actions/statusTypes', () => ({
  listStatusTypes: vi.fn()
}));

vi.mock('@/actions/states', () => ({
  createState: vi.fn()
}));

vi.mock('@/actions/items', () => ({
  getItem: vi.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
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

