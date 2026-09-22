/**
 * Filesystem-backed implementation of ItemRepository.
 *
 * Stores items as JSON in `$TMPDIR/datia-sandbox/items.json`.
 * Intended exclusively for the sandbox/docs-preview context — zero DB impact.
 * Dashboard-specific analytics methods (counts, exports, backups) return
 * stubs since they are not exercised through the public API.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type {
  ItemRepository,
  ItemRecord,
  CreateItemInput,
} from '@/domain/items/ItemRepository';
import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

const SANDBOX_DIR = join(tmpdir(), 'datia-sandbox');
const ITEMS_FILE = join(SANDBOX_DIR, 'items.json');

// ── Storage helpers ────────────────────────────────────────────────────────

function ensureDir(): void {
  mkdirSync(SANDBOX_DIR, { recursive: true });
}

function readAll(): ItemRecord[] {
  try {
    const raw = readFileSync(ITEMS_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      imageUrl: (r.imageUrl as string | null) ?? null,
      evidenceID: (r.evidenceID as string | null) ?? null,
      latitude: null,
      longitude: null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }));
  } catch {
    return [];
  }
}

function writeAll(items: ItemRecord[]): void {
  ensureDir();
  writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

// Extended record stored on disk includes organizationId for multi-tenant filtering
interface PersistedItem extends ItemRecord {
  organizationId: string;
}

function readRaw(): PersistedItem[] {
  try {
    const raw = readFileSync(ITEMS_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((r) => ({
      id: r.id as string,
      organizationId: r.organizationId as string,
      name: r.name as string,
      description: r.description as string,
      imageUrl: (r.imageUrl as string | null) ?? null,
      evidenceID: (r.evidenceID as string | null) ?? null,
      latitude: null,
      longitude: null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }));
  } catch {
    return [];
  }
}

function writeRaw(items: PersistedItem[]): void {
  ensureDir();
  writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf-8');
}

function toRecord(p: PersistedItem): ItemRecord {
  const { organizationId: _org, ...record } = p;
  return record;
}

// ── Cursor pagination helper ───────────────────────────────────────────────

function paginateItems<T extends { id: string; createdAt: Date }>(
  items: T[],
  params: CursorPaginationParams
): CursorPaginationResult<T> {
  const limit = params.limit ?? 20;
  const sorted = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  let startIdx = 0;
  if (params.cursor) {
    const idx = sorted.findIndex((i) => i.id === params.cursor);
    if (idx !== -1) startIdx = idx + 1;
  }
  const page = sorted.slice(startIdx, startIdx + limit);
  const hasNextPage = startIdx + limit < sorted.length;
  return {
    data: page,
    nextCursor: hasNextPage ? page[page.length - 1]?.id ?? null : null,
    hasNextPage,
  };
}

// ── Repository implementation ──────────────────────────────────────────────

export const itemRepositoryFilesystem: ItemRepository = {
  async create(input: CreateItemInput): Promise<ItemRecord> {
    const all = readRaw();
    const now = new Date();
    const record: PersistedItem = {
      id: input.id,
      organizationId: input.organizationId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      evidenceID: null,
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    };
    writeRaw([...all, record]);
    return toRecord(record);
  },

  async getById(id: string, organizationId: string): Promise<ItemRecord | null> {
    const found = readRaw().find((r) => r.id === id && r.organizationId === organizationId);
    return found ? toRecord(found) : null;
  },

  async findByOrganization(organizationId: string): Promise<ItemRecord[]> {
    return readRaw()
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toRecord);
  },

  async delete(id: string, organizationId: string): Promise<void> {
    writeRaw(readRaw().filter((r) => !(r.id === id && r.organizationId === organizationId)));
  },

  async updateEvidenceId(_id, _organizationId, _evidenceID): Promise<void> {
    // No-op: sandbox items don't get blockchain evidence
  },

  async getDetails(id: string, organizationId: string) {
    const item = readRaw().find((r) => r.id === id && r.organizationId === organizationId);
    if (!item) return null;
    return {
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.imageUrl,
      states: [],
      _count: { states: 0 },
    };
  },






  async search(query: string, organizationId: string) {
    const q = query.toLowerCase();
    return readRaw()
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
      }));
  },

  async countTotalItems(organizationId: string): Promise<number> {
    return readRaw().filter((r) => r.organizationId === organizationId).length;
  },

  async countActiveItems(_organizationId, _days): Promise<number> {
    return 0;
  },

  async countItemsByMonth(_organizationId, _startDate, _endDate): Promise<number> {
    return 0;
  },


  async importMany(_organizationId, _rows): Promise<void> {
    // No-op
  },

  async listForExport(_organizationId, _options) {
    return [];
  },

  async listPaginated(organizationId, params) {
    const items = readRaw()
      .filter((r) => r.organizationId === organizationId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
      }));
    return paginateItems(items, params);
  },


  async searchPaginated(query, organizationId, params) {
    const q = query.toLowerCase();
    const items = readRaw()
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
      }));
    return paginateItems(items, params);
  },
};
