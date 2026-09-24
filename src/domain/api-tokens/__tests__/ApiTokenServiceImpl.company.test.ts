import { describe, it, expect, vi } from 'vitest';
import { createApiTokenServiceImpl } from '../ApiTokenServiceImpl';
import type { ApiTokenRepository, ApiTokenRecord } from '../ApiTokenRepository';

const record = (over: Partial<ApiTokenRecord> = {}): ApiTokenRecord => ({
  id: 't-1',
  name: 'ERP',
  tokenHash: 'h',
  organizationId: 'org-1',
  companyId: 'co-1',
  lastUsedAt: null,
  expiresAt: null,
  createdAt: new Date('2026-09-24T10:00:00Z'),
  ...over,
});

function repoWith(found: ApiTokenRecord | null) {
  return {
    create: vi.fn(async (input) => record({ ...input })),
    findByTokenHash: vi.fn(async () => found),
    updateLastUsed: vi.fn(async () => undefined),
  } as unknown as ApiTokenRepository;
}

describe('API token company (#20)', () => {
  it('tells the company a valid token acts for', async () => {
    const service = createApiTokenServiceImpl({ apiTokenRepository: repoWith(record()) });
    await expect(service.validateToken('h')).resolves.toEqual({
      organizationId: 'org-1',
      companyId: 'co-1',
      tokenId: 't-1',
    });
  });

  it('reports no company for a token issued at organisation level', async () => {
    const service = createApiTokenServiceImpl({ apiTokenRepository: repoWith(record({ companyId: null })) });
    await expect(service.validateToken('h')).resolves.toMatchObject({ companyId: null });
  });

  it('stores the company it is created for', async () => {
    const repo = repoWith(null);
    await createApiTokenServiceImpl({ apiTokenRepository: repo }).createToken({
      name: 'ERP',
      organizationId: 'org-1',
      companyId: 'co-1',
    });
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1', companyId: 'co-1' }));
  });
});
