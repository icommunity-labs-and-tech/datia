/**
 * Filesystem-backed implementation of ApiTokenRepository.
 *
 * Stores tokens as a JSON file in the OS temp directory
 * (`$TMPDIR/certypass-sandbox/tokens.json`). Data survives process restarts
 * but is wiped when the container is replaced — intentionally ephemeral.
 *
 * This is the sandbox adapter used so that docs-preview tokens never touch
 * the real database. Drop-in replacement for ApiTokenRepositoryPrisma via
 * the ApiTokenRepository interface (hexagonal port).
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type {
  ApiTokenRepository,
  ApiTokenRecord,
  CreateApiTokenInput,
} from '@/domain/api-tokens/ApiTokenRepository';

const SANDBOX_DIR = join(tmpdir(), 'certypass-sandbox');
const TOKENS_FILE = join(SANDBOX_DIR, 'tokens.json');

function ensureDir(): void {
  mkdirSync(SANDBOX_DIR, { recursive: true });
}

function readAll(): ApiTokenRecord[] {
  try {
    const raw = readFileSync(TOKENS_FILE, 'utf-8');
    const parsed: Array<Record<string, unknown>> = JSON.parse(raw);
    return parsed.map((t) => ({
      id: t.id as string,
      name: t.name as string,
      tokenHash: t.tokenHash as string,
      organizationId: t.organizationId as string,
      lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt as string) : null,
      expiresAt: t.expiresAt ? new Date(t.expiresAt as string) : null,
      createdAt: new Date(t.createdAt as string),
    }));
  } catch {
    return [];
  }
}

function writeAll(tokens: ApiTokenRecord[]): void {
  ensureDir();
  writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2), 'utf-8');
}

export const apiTokenRepositoryFilesystem: ApiTokenRepository = {
  async create(input: CreateApiTokenInput): Promise<ApiTokenRecord> {
    const tokens = readAll();
    const record: ApiTokenRecord = {
      id: randomUUID(),
      name: input.name,
      tokenHash: input.tokenHash,
      organizationId: input.organizationId,
      expiresAt: input.expiresAt ?? null,
      lastUsedAt: null,
      createdAt: new Date(),
    };
    writeAll([...tokens, record]);
    return record;
  },

  async findByOrganization(organizationId: string): Promise<ApiTokenRecord[]> {
    return readAll()
      .filter((t) => t.organizationId === organizationId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async findById(id: string, organizationId: string): Promise<ApiTokenRecord | null> {
    return readAll().find((t) => t.id === id && t.organizationId === organizationId) ?? null;
  },

  async findByTokenHash(tokenHash: string): Promise<ApiTokenRecord | null> {
    return readAll().find((t) => t.tokenHash === tokenHash) ?? null;
  },

  async updateLastUsed(id: string): Promise<void> {
    const tokens = readAll();
    const idx = tokens.findIndex((t) => t.id === id);
    if (idx !== -1) {
      tokens[idx] = { ...tokens[idx], lastUsedAt: new Date() };
      writeAll(tokens);
    }
  },

  async delete(id: string, organizationId: string): Promise<void> {
    writeAll(readAll().filter((t) => !(t.id === id && t.organizationId === organizationId)));
  },
};
