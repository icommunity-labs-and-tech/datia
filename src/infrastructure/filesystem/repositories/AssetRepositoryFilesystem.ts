/**
 * Filesystem-backed implementation of AssetRepository.
 *
 * Stores assets as JSON in `$TMPDIR/datia-sandbox/assets.json`.
 * Intended exclusively for the sandbox/docs-preview context — zero DB impact.
 * Dashboard-specific analytics methods (counts, exports, backups) return
 * stubs since they are not exercised through the public API.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type {
  AssetRepository,
  AssetRecord,
  CreateAssetInput,
} from '@/domain/assets/AssetRepository';
import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import type { Scope } from '@/lib/scope';

const SANDBOX_DIR = join(tmpdir(), 'datia-sandbox');
const ASSETS_FILE = join(SANDBOX_DIR, 'assets.json');

// ── Storage helpers ────────────────────────────────────────────────────────

function ensureDir(): void {
  mkdirSync(SANDBOX_DIR, { recursive: true });
}

function readAll(): AssetRecord[] {
  try {
    const raw = readFileSync(ASSETS_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      description: r.description as string,
      imageUrl: (r.imageUrl as string | null) ?? null,
      evidenceId: (r.evidenceId as string | null) ?? null,
      latitude: null,
      longitude: null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }));
  } catch {
    return [];
  }
}

function writeAll(assets: AssetRecord[]): void {
  ensureDir();
  writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf-8');
}

// Extended record stored on disk includes organizationId for multi-tenant filtering
interface PersistedAsset extends AssetRecord {
  organizationId: string;
}

function readRaw(): PersistedAsset[] {
  try {
    const raw = readFileSync(ASSETS_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((r) => ({
      id: r.id as string,
      organizationId: r.organizationId as string,
      name: r.name as string,
      description: r.description as string,
      imageUrl: (r.imageUrl as string | null) ?? null,
      evidenceId: (r.evidenceId as string | null) ?? null,
      latitude: null,
      longitude: null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
    }));
  } catch {
    return [];
  }
}

function writeRaw(assets: PersistedAsset[]): void {
  ensureDir();
  writeFileSync(ASSETS_FILE, JSON.stringify(assets, null, 2), 'utf-8');
}

function toRecord(p: PersistedAsset): AssetRecord {
  const { organizationId: _org, ...record } = p;
  return record;
}

// ── Cursor pagination helper ───────────────────────────────────────────────

function paginateItems<T extends { id: string; createdAt: Date }>(
  assets: T[],
  params: CursorPaginationParams
): CursorPaginationResult<T> {
  const limit = params.limit ?? 20;
  const sorted = [...assets].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

export const assetRepositoryFilesystem: AssetRepository = {
  async create(input: CreateAssetInput): Promise<AssetRecord> {
    const all = readRaw();
    const now = new Date();
    const record: PersistedAsset = {
      id: input.id,
      organizationId: input.scope.organizationId,
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl ?? null,
      evidenceId: null,
      latitude: null,
      longitude: null,
      createdAt: now,
      updatedAt: now,
    };
    writeRaw([...all, record]);
    return toRecord(record);
  },

  async getById(id: string, scope: Scope): Promise<AssetRecord | null> {
    const found = readRaw().find((r) => r.id === id && r.organizationId === scope.organizationId);
    return found ? toRecord(found) : null;
  },

  async findByOrganization(scope: Scope): Promise<AssetRecord[]> {
    return readRaw()
      .filter((r) => r.organizationId === scope.organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toRecord);
  },

  async delete(id: string, scope: Scope): Promise<void> {
    writeRaw(readRaw().filter((r) => !(r.id === id && r.organizationId === scope.organizationId)));
  },

  async updateEvidenceId(_id, _organizationId, _evidenceID): Promise<void> {
    // No-op: sandbox assets don't get blockchain evidence
  },

  async getDetails(id: string, scope: Scope) {
    const asset = readRaw().find((r) => r.id === id && r.organizationId === scope.organizationId);
    if (!asset) return null;
    return {
      id: asset.id,
      name: asset.name,
      description: asset.description,
      imageUrl: asset.imageUrl,
      states: [],
      _count: { states: 0 },
    };
  },






  async search(query: string, scope: Scope) {
    const q = query.toLowerCase();
    return readRaw()
      .filter(
        (r) =>
          r.organizationId === scope.organizationId &&
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

  async countTotalItems(scope: Scope): Promise<number> {
    return readRaw().filter((r) => r.organizationId === scope.organizationId).length;
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

  async listPaginated(scope, params) {
    const assets = readRaw()
      .filter((r) => r.organizationId === scope.organizationId)
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
      }));
    return paginateItems(assets, params);
  },


  async searchPaginated(query, scope, params) {
    const q = query.toLowerCase();
    const assets = readRaw()
      .filter(
        (r) =>
          r.organizationId === scope.organizationId &&
          (r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
      }));
    return paginateItems(assets, params);
  },
};
