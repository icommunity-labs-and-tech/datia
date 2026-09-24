import { describe, it, expect } from 'vitest';
import { scopeWhere } from '@/lib/scope';

describe('scopeWhere', () => {
  it('restricts to the company as well as the organisation for a company account', () => {
    expect(scopeWhere({ organizationId: 'org-1', companyId: 'co-1' })).toEqual({
      organizationId: 'org-1',
      companyId: 'co-1',
    });
  });

  it('covers every company of the organisation when there is none', () => {
    expect(scopeWhere({ organizationId: 'org-1', companyId: null })).toEqual({ organizationId: 'org-1' });
  });
});
