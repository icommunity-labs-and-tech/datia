import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A company account sees its company's rows and nobody else's; the account that
 * operates the organisation, having no company, sees all of them (#20). What
 * matters is the `where` each repository sends, so these check that and nothing
 * about Prisma itself.
 */

const { db } = vi.hoisted(() => {
  const model = () => ({
    findMany: vi.fn(async () => []),
    findFirst: vi.fn(async () => null),
    count: vi.fn(async () => 0),
    create: vi.fn(async ({ data }: any) => ({ ...data, createdAt: new Date(), updatedAt: new Date() })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
    update: vi.fn(async () => ({})),
  });
  return {
    db: {
      asset: model(),
      eventLog: model(),
      webhook: model(),
      apiToken: model(),
      apiCall: model(),
      user: model(),
      company: model(),
      organization: { findUnique: vi.fn(async () => ({ name: 'Org' })) },
      $transaction: vi.fn(async (fn: any) => fn(db)),
    } as Record<string, any>,
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: db }));

import { assetRepository } from '../AssetRepositoryPrisma';
import { eventRepository } from '../EventRepositoryPrisma';
import { webhookRepository } from '../WebhookRepositoryPrisma';
import { apiTokenRepository } from '../ApiTokenRepositoryPrisma';
import { apiCallRepository } from '../ApiCallRepositoryPrisma';
import { userRepository } from '../UserRepositoryPrisma';

const company = { organizationId: 'org-1', companyId: 'co-1' };
const organisation = { organizationId: 'org-1', companyId: null };
const params = { limit: 10 };

const lastWhere = (model: string, fn: 'findMany' | 'findFirst' | 'count' | 'deleteMany') =>
  db[model][fn].mock.calls.at(-1)![0].where;

beforeEach(() => {
  vi.clearAllMocks();
  db.company.findFirst.mockResolvedValue({ id: 'co-default' });
});

describe('reads are restricted to the company of the scope', () => {
  const cases: Array<[string, string, 'findMany' | 'findFirst' | 'count', (s: typeof company) => Promise<unknown>]> = [
    ['asset getById', 'asset', 'findFirst', (s) => assetRepository.getById('a-1', s)],
    ['asset listForExport', 'asset', 'findMany', (s) => assetRepository.listForExport(s, { fullPassport: false })],
    ['asset search', 'asset', 'findMany', (s) => assetRepository.search('turbina', s)],
    ['asset count', 'asset', 'count', (s) => assetRepository.countTotalItems(s)],
    ['asset listPaginated', 'asset', 'findMany', (s) => assetRepository.listPaginated(s, params)],
    ['event list', 'eventLog', 'findMany', (s) => eventRepository.list(s)],
    ['event getById', 'eventLog', 'findFirst', (s) => eventRepository.getById(s, 'e-1')],
    ['event findByType', 'eventLog', 'findMany', (s) => eventRepository.findByType(s, 'asset.created')],
    ['webhook list', 'webhook', 'findMany', (s) => webhookRepository.list(s)],
    ['webhook findByEvent', 'webhook', 'findMany', (s) => webhookRepository.findByEvent(s, 'asset.created')],
    ['token list', 'apiToken', 'findMany', (s) => apiTokenRepository.findByOrganization(s)],
    ['token findById', 'apiToken', 'findFirst', (s) => apiTokenRepository.findById('t-1', s)],
    ['api call count', 'apiCall', 'count', (s) => apiCallRepository.countByToken('t-1', s)],
    ['user list', 'user', 'findMany', (s) => userRepository.findByOrganization(s)],
    ['user count', 'user', 'count', (s) => userRepository.countAdmins(s)],
  ];

  it.each(cases)('%s', async (_name, model, fn, run) => {
    await run(company);
    expect(lastWhere(model, fn)).toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
  });

  it.each(cases)('%s, for the account that operates the organisation', async (_name, model, fn, run) => {
    await run(organisation);
    const where = lastWhere(model, fn);
    expect(where).toMatchObject({ organizationId: 'org-1' });
    expect(where).not.toHaveProperty('companyId');
  });
});

describe('paginated reads keep the scope on the next page', () => {
  it('assets', async () => {
    db.asset.findFirst.mockResolvedValueOnce({ id: 'a-9', createdAt: new Date() });
    await assetRepository.listPaginated(company, { limit: 10, cursor: 'a-9' });

    expect(db.asset.findFirst.mock.calls[0][0].where).toMatchObject(company);
    expect(db.asset.findMany.mock.calls[0][0].where).toMatchObject(company);
  });

  it('asset searches', async () => {
    db.asset.findFirst.mockResolvedValueOnce({ id: 'a-9', createdAt: new Date() });
    await assetRepository.searchPaginated('turbina', company, { limit: 10, cursor: 'a-9' });

    const cursorWhere = db.asset.findFirst.mock.calls[0][0].where;
    expect(cursorWhere).toMatchObject(company);
    const { AND } = db.asset.findMany.mock.calls[0][0].where;
    expect(AND).toContainEqual(company);
  });

  it('events, with their filters', async () => {
    db.eventLog.findFirst.mockResolvedValueOnce({ id: 'e-9', createdAt: new Date() });
    await eventRepository.listPaginated(company, { limit: 10, cursor: 'e-9', eventType: 'asset.created' });

    expect(db.eventLog.findFirst.mock.calls[0][0].where).toMatchObject(company);
    const { AND } = db.eventLog.findMany.mock.calls[0][0].where;
    expect(AND).toContainEqual(company);
    expect(AND).toContainEqual({ eventType: 'asset.created' });
  });
});

describe('writes are filed under the company of the scope', () => {
  const asset = { id: 'a-1', name: 'A', description: '', createdByUserId: null };

  it('an asset', async () => {
    await assetRepository.create({ ...asset, scope: company });
    expect(db.asset.create.mock.calls[0][0].data).toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
  });

  it('an imported batch', async () => {
    await assetRepository.importMany(company, [{ id: 'a-1', name: 'A', description: null }]);
    expect(db.asset.create.mock.calls[0][0].data).toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
  });

  it('an event, a webhook and a token', async () => {
    await eventRepository.create(company, { eventType: 'x', entityType: 'X', entityId: '1', data: {} });
    await webhookRepository.create(company, { url: 'https://x.test', events: ['x'] } as any);
    await apiTokenRepository.create({ name: 'ERP', tokenHash: 'h', organizationId: 'org-1', companyId: 'co-1' });

    for (const model of ['eventLog', 'webhook', 'apiToken']) {
      expect(db[model].create.mock.calls[0][0].data).toMatchObject({ organizationId: 'org-1', companyId: 'co-1' });
    }
  });

  it('the default company for the account that has none', async () => {
    await assetRepository.create({ ...asset, scope: organisation });
    await eventRepository.create(organisation, { eventType: 'x', entityType: 'X', entityId: '1', data: {} });

    expect(db.asset.create.mock.calls[0][0].data.companyId).toBe('co-default');
    expect(db.eventLog.create.mock.calls[0][0].data.companyId).toBe('co-default');
  });
});

describe('a company account cannot reach into another company', () => {
  it('deleting a token looks only inside its company', async () => {
    await apiTokenRepository.delete('t-1', company);
    expect(lastWhere('apiToken', 'deleteMany')).toMatchObject({ id: 't-1', ...company });
  });

  it('a role change reaches a company account and nothing else', async () => {
    db.user.findFirst.mockResolvedValueOnce({ id: 'u-1', role: 'ADMIN' });
    await userRepository.update('u-1', company, { role: 'ADMIN' });
    expect(db.user.update.mock.calls[0][0].data).toMatchObject({ role: 'ADMIN' });

    // The account form always sends ADMIN: applied to the organization's own
    // account it would demote it.
    db.user.update.mockClear();
    db.user.findFirst.mockResolvedValueOnce({ id: 'u-2', role: 'ORG_ADMIN' });
    await userRepository.update('u-2', organisation, { role: 'ADMIN', name: 'Nuevo' });
    expect(db.user.update.mock.calls[0][0].data).toEqual({ name: 'Nuevo' });
  });

  it('updating a user checks the company first', async () => {
    await expect(userRepository.update('u-1', company, { name: 'X' })).rejects.toThrow();
    expect(lastWhere('user', 'findFirst')).toMatchObject({ id: 'u-1', ...company });
    expect(db.user.update).not.toHaveBeenCalled();
  });
});
