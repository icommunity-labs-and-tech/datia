import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Scope } from '@/lib/scope';

/**
 * An account that belongs to a company must not reach another company's rows
 * through any repository query, even inside its own organisation (#25). These
 * tests read the `where` each query sends, so a query that drops the company
 * filter fails here before it reaches a database.
 */

const { mockPrisma } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn().mockResolvedValue([]),
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    aggregate: vi.fn().mockResolvedValue({ _count: 0, _sum: { consumptionKwh: 0, co2eKg: 0 } }),
  });
  return {
    mockPrisma: {
      asset: model(),
      webhook: model(),
      user: model(),
      energySource: model(),
      energyConsumption: model(),
      emissionRecord: model(),
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('@/lib/company', () => ({ companyFor: vi.fn(async (s: Scope) => s.companyId ?? 'default-co') }));

import { assetRepository } from '@/infrastructure/prisma/repositories/AssetRepositoryPrisma';
import { webhookRepository } from '@/infrastructure/prisma/repositories/WebhookRepositoryPrisma';
import { userRepository } from '@/infrastructure/prisma/repositories/UserRepositoryPrisma';
import { energyRepository } from '@/infrastructure/prisma/repositories/EnergyRepositoryPrisma';

const COMPANY: Scope = { organizationId: 'org-1', companyId: 'co-1' };
const ORGANIZATION: Scope = { organizationId: 'org-1', companyId: null };
const PAGE = { limit: 20, cursor: undefined } as const;

const companyFilter = { organizationId: 'org-1', companyId: 'co-1' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('company account: asset queries carry the company filter', () => {
  it('findByOrganization', async () => {
    await assetRepository.findByOrganization(COMPANY);
    expect(mockPrisma.asset.findMany.mock.calls[0][0].where).toEqual(companyFilter);
  });

  it('getById', async () => {
    await assetRepository.getById('a-1', COMPANY);
    expect(mockPrisma.asset.findFirst.mock.calls[0][0].where).toEqual({ id: 'a-1', ...companyFilter });
  });

  it('getDetails', async () => {
    await assetRepository.getDetails('a-1', COMPANY);
    expect(mockPrisma.asset.findFirst.mock.calls[0][0].where).toEqual({ id: 'a-1', ...companyFilter });
  });

  it('search', async () => {
    await assetRepository.search('turbina', COMPANY);
    expect(mockPrisma.asset.findMany.mock.calls[0][0].where).toMatchObject(companyFilter);
  });

  it('listPaginated keeps the filter when a cursor adds its own clause', async () => {
    mockPrisma.asset.findFirst.mockResolvedValueOnce({ createdAt: new Date(0), id: 'a-0' });
    await assetRepository.listPaginated(COMPANY, { ...PAGE, cursor: 'a-0' });
    expect(mockPrisma.asset.findFirst.mock.calls[0][0].where).toEqual({ id: 'a-0', ...companyFilter });
    expect(mockPrisma.asset.findMany.mock.calls[0][0].where).toMatchObject(companyFilter);
  });

  it('countTotalItems', async () => {
    await assetRepository.countTotalItems(COMPANY);
    expect(mockPrisma.asset.count.mock.calls[0][0].where).toEqual(companyFilter);
  });

  it('delete checks the company before removing by id', async () => {
    mockPrisma.asset.findFirst.mockResolvedValueOnce({ id: 'a-1' });
    await assetRepository.delete('a-1', COMPANY);
    expect(mockPrisma.asset.findFirst.mock.calls[0][0].where).toEqual({ id: 'a-1', ...companyFilter });
    expect(mockPrisma.asset.delete).toHaveBeenCalledWith({ where: { id: 'a-1' } });
  });

  it('delete refuses an asset outside the company without removing anything', async () => {
    await expect(assetRepository.delete('a-other', COMPANY)).rejects.toThrow();
    expect(mockPrisma.asset.delete).not.toHaveBeenCalled();
  });
});

describe('company account: webhook queries carry the company filter', () => {
  it('list', async () => {
    await webhookRepository.list(COMPANY);
    expect(mockPrisma.webhook.findMany.mock.calls[0][0].where).toEqual(companyFilter);
  });

  it('getById', async () => {
    await webhookRepository.getById('w-1', COMPANY);
    expect(mockPrisma.webhook.findFirst.mock.calls[0][0].where).toEqual({ id: 'w-1', ...companyFilter });
  });

  it('update refuses a webhook outside the company without writing', async () => {
    await expect(webhookRepository.update('w-other', COMPANY, { active: false })).rejects.toThrow();
    expect(mockPrisma.webhook.update).not.toHaveBeenCalled();
  });

  it('delete refuses a webhook outside the company without deleting', async () => {
    await expect(webhookRepository.delete('w-other', COMPANY)).rejects.toThrow();
    expect(mockPrisma.webhook.delete).not.toHaveBeenCalled();
  });

  it('findByEvent', async () => {
    await webhookRepository.findByEvent(COMPANY, 'emission.created');
    expect(mockPrisma.webhook.findMany.mock.calls[0][0].where).toMatchObject(companyFilter);
  });
});

describe('company account: user queries carry the company filter', () => {
  it('findByOrganization', async () => {
    await userRepository.findByOrganization(COMPANY);
    expect(mockPrisma.user.findMany.mock.calls[0][0].where).toEqual(companyFilter);
  });

  it('delete refuses a user outside the company without deleting', async () => {
    await expect(userRepository.delete('u-other', COMPANY)).rejects.toThrow();
    expect(mockPrisma.user.delete).not.toHaveBeenCalled();
  });
});

describe('company account: energy queries reach the company through the asset', () => {
  const viaCompany = { Asset: companyFilter };

  it('findSourceById', async () => {
    await energyRepository.findSourceById(COMPANY, 's-1');
    expect(mockPrisma.energySource.findFirst.mock.calls[0][0].where).toEqual({
      id: 's-1',
      Asset: companyFilter,
    });
  });

  it('findEmissionById', async () => {
    await energyRepository.findEmissionById(COMPANY, 'e-1');
    expect(mockPrisma.emissionRecord.findFirst.mock.calls[0][0].where).toEqual({
      id: 'e-1',
      EnergyConsumption: { EnergySource: viaCompany },
    });
  });

  it('getConsumptionTotals sums only the company’s consumption', async () => {
    await energyRepository.getConsumptionTotals(COMPANY);
    expect(mockPrisma.energyConsumption.aggregate.mock.calls[0][0].where).toEqual({ EnergySource: viaCompany });
    expect(mockPrisma.energyConsumption.findMany.mock.calls[0][0].where).toEqual({ EnergySource: viaCompany });
  });
});

describe('organisation account: the same queries cover every company, not just one', () => {
  it('asset list has no company filter', async () => {
    await assetRepository.findByOrganization(ORGANIZATION);
    expect(mockPrisma.asset.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1' });
  });

  it('webhook list has no company filter', async () => {
    await webhookRepository.list(ORGANIZATION);
    expect(mockPrisma.webhook.findMany.mock.calls[0][0].where).toEqual({ organizationId: 'org-1' });
  });

  it('energy totals reach every company through the organisation', async () => {
    await energyRepository.getConsumptionTotals(ORGANIZATION);
    expect(mockPrisma.energyConsumption.aggregate.mock.calls[0][0].where).toEqual({
      EnergySource: { Asset: { organizationId: 'org-1' } },
    });
  });
});
