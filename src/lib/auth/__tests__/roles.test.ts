import { describe, it, expect } from 'vitest';
import { isDashboardRole, isOrganizationRole } from '../roles';

describe('roles', () => {
  it('opens the dashboard to a company account and to nobody else', () => {
    expect(isDashboardRole('ADMIN')).toBe(true);
    // The organization account has its own panel: the dashboard is the companies'.
    for (const role of ['ORG_ADMIN', 'SUPER_ADMIN', 'USER', '', null, undefined, 42]) {
      expect(isDashboardRole(role)).toBe(false);
    }
  });

  it('tells the organization account from a company one', () => {
    expect(isOrganizationRole('ORG_ADMIN')).toBe(true);
    expect(isOrganizationRole('ADMIN')).toBe(false);
    expect(isOrganizationRole('SUPER_ADMIN')).toBe(false);
  });
});
