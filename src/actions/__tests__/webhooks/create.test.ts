import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireScope, mockCreate } = vi.hoisted(() => ({ mockRequireScope: vi.fn(), mockCreate: vi.fn() }));

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireCompanyScope: mockRequireScope };
});
vi.mock('@/infrastructure/prisma/repositories/WebhookRepositoryPrisma', () => ({
  webhookRepository: { create: mockCreate },
}));

import { createWebhook } from '@/actions/webhooks/create';
import { CompanyRequiredError } from '@/lib/auth/tenant';

const data = { name: 'ERP', url: 'https://erp.test/hook', events: ['asset.created'] };
const scope = { organizationId: 'org-1', companyId: 'co-1' };

describe('createWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireScope.mockResolvedValue(scope);
    mockCreate.mockResolvedValue({ id: 'wh-1' });
  });

  it('files the webhook under the company of the scope', async () => {
    await createWebhook(data);
    expect(mockCreate).toHaveBeenCalledWith(scope, expect.objectContaining({ name: 'ERP' }));
  });

  it('asks the organization account to choose a company: a webhook only hears its own', async () => {
    mockRequireScope.mockRejectedValue(new CompanyRequiredError());
    const result = await createWebhook(data);

    expect(result).toMatchObject({ success: false, code: 'company_required' });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
