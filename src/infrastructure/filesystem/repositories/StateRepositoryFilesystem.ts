/**
 * Filesystem-backed implementation of StateRepository.
 *
 * Stores states as JSON in `$TMPDIR/certypass-sandbox/states.json`.
 * Intended exclusively for the sandbox/docs-preview context — zero DB impact.
 * Analytics/aggregation methods return stubs since they are not exercised
 * through the public API.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type { StateRepository, StateRecord, CreateStateInput } from '@/domain/states/StateRepository';
import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';

const SANDBOX_DIR = join(tmpdir(), 'certypass-sandbox');
const STATES_FILE = join(SANDBOX_DIR, 'states.json');

// ── Storage helpers ────────────────────────────────────────────────────────

function ensureDir(): void {
  mkdirSync(SANDBOX_DIR, { recursive: true });
}

// Extended record stored on disk includes organizationId + denormalized status type name
interface PersistedState extends StateRecord {
  organizationId: string;
  templateConfig: Record<string, any> | null;
  statusTypeName: string;
  statusTypeDescription: string | null;
}

function readRaw(): PersistedState[] {
  try {
    const raw = readFileSync(STATES_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((r) => ({
      id: r.id as string,
      organizationId: r.organizationId as string,
      title: r.title as string,
      description: r.description as string,
      statusTypeId: r.statusTypeId as string,
      statusTypeName: (r.statusTypeName as string) || '',
      statusTypeDescription: (r.statusTypeDescription as string | null) ?? null,
      itemId: r.itemId as string,
      imageUrls: (r.imageUrls as string[] | null) ?? null,
      evidenceID: (r.evidenceID as string | null) ?? null,
      templateConfig: (r.templateConfig as Record<string, any> | null) ?? null,
      createdAt: new Date(r.createdAt as string),
      updatedAt: new Date(r.updatedAt as string),
      backed: (r.backed as boolean | null) ?? null,
    }));
  } catch {
    return [];
  }
}

function writeRaw(states: PersistedState[]): void {
  ensureDir();
  writeFileSync(STATES_FILE, JSON.stringify(states, null, 2), 'utf-8');
}

function toRecord(p: PersistedState): StateRecord {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    statusTypeId: p.statusTypeId,
    itemId: p.itemId,
    imageUrls: p.imageUrls,
    evidenceID: p.evidenceID,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    backed: p.backed,
  };
}

function paginateStates<T extends { id: string; createdAt: Date }>(
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

export const stateRepositoryFilesystem: StateRepository = {
  async create(input: CreateStateInput): Promise<StateRecord> {
    const all = readRaw();
    const now = new Date();
    const record: PersistedState = {
      id: randomUUID(),
      organizationId: (input as any).organizationId ?? 'sandbox',
      title: input.title,
      description: input.description,
      statusTypeId: input.statusTypeId,
      statusTypeName: (input as any).statusTypeName ?? '',
      statusTypeDescription: (input as any).statusTypeDescription ?? null,
      itemId: input.itemId,
      imageUrls: input.imageUrls ?? null,
      evidenceID: null,
      templateConfig: input.templateConfig ?? null,
      createdAt: now,
      updatedAt: now,
      backed: null,
    };
    writeRaw([...all, record]);
    return toRecord(record);
  },

  async getById(id: string, organizationId: string): Promise<StateRecord | null> {
    const found = readRaw().find((r) => r.id === id && r.organizationId === organizationId);
    return found ? toRecord(found) : null;
  },

  async updateEvidenceId(_id, _organizationId, _evidenceID): Promise<void> {
    // No-op: sandbox states don't get blockchain evidence
  },

  async delete(id: string, organizationId: string): Promise<void> {
    writeRaw(readRaw().filter((r) => !(r.id === id && r.organizationId === organizationId)));
  },

  async listByItem(itemId: string, organizationId: string) {
    return readRaw()
      .filter((r) => r.itemId === itemId && r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        imageUrls: r.imageUrls,
        templateConfig: r.templateConfig ?? undefined,
        createdAt: r.createdAt,
        evidenceID: r.evidenceID,
        backed: r.backed ?? null,
        statusType: {
          id: r.statusTypeId,
          name: r.statusTypeName,
          description: r.statusTypeDescription,
        },
      }));
  },

  async update(id: string, organizationId: string, data) {
    const all = readRaw();
    const idx = all.findIndex((r) => r.id === id && r.organizationId === organizationId);
    if (idx === -1) throw new Error(`State not found: ${id}`);
    const updated: PersistedState = {
      ...all[idx],
      ...(data.itemId !== undefined && { itemId: data.itemId }),
      ...(data.statusTypeId !== undefined && { statusTypeId: data.statusTypeId }),
      ...(data.evidenceID !== undefined && { evidenceID: data.evidenceID }),
      ...(data.backed !== undefined && { backed: data.backed }),
      ...(data.description !== undefined && { description: data.description ?? '' }),
      updatedAt: new Date(),
    };
    all[idx] = updated;
    writeRaw(all);
    return {
      id: updated.id,
      itemId: updated.itemId,
      statusTypeId: updated.statusTypeId,
      evidenceID: updated.evidenceID ?? null,
      backed: updated.backed ?? null,
      description: updated.description ?? null,
      createdAt: updated.createdAt,
    } as {
      id: string;
      itemId: string;
      statusTypeId: string;
      evidenceID: string | null;
      backed: boolean | null;
      description: string | null;
      createdAt: Date;
    };
  },

  async list(organizationId: string) {
    return readRaw()
      .filter((r) => r.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        statusTypeId: r.statusTypeId,
        itemId: r.itemId,
        createdAt: r.createdAt,
        evidenceID: r.evidenceID ?? null,
        backed: r.backed ?? null,
      }));
  },

  async listPaginated(organizationId, params) {
    const { itemId, ...paginationParams } = params;
    const items = readRaw()
      .filter(
        (r) =>
          r.organizationId === organizationId &&
          (itemId === undefined || r.itemId === itemId)
      )
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        statusTypeId: r.statusTypeId,
        itemId: r.itemId,
        createdAt: r.createdAt,
        evidenceID: r.evidenceID ?? null,
        backed: r.backed ?? null,
      }));
    return paginateStates(items, paginationParams);
  },

  // ── Analytics stubs (not used via public API) ────────────────────────────

  async countTotalStates(organizationId: string): Promise<number> {
    return readRaw().filter((r) => r.organizationId === organizationId).length;
  },

  async countBackedStates(_organizationId): Promise<number> {
    return 0;
  },

  async countStatesThisMonth(organizationId: string, startDate: Date): Promise<number> {
    return readRaw().filter(
      (r) => r.organizationId === organizationId && r.createdAt >= startDate
    ).length;
  },

  async getStatesByUserGrouped(_organizationId, _startDate) {
    return [];
  },

  async getBackedStatesByUserGrouped(_organizationId, _startDate) {
    return [];
  },

  async findAll(): Promise<StateRecord[]> {
    return readRaw().map(toRecord);
  },
};
