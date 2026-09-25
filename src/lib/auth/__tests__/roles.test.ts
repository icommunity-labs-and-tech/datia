import { describe, it, expect } from 'vitest';
import { isDashboardRole, isOrganizationRole } from '../roles';

describe('roles', () => {
  it('lets a company account and the organization account open the dashboard', () => {
    expect(isDashboardRole('ADMIN')).toBe(true);
    expect(isDashboardRole('ORG_ADMIN')).toBe(true);
  });

  it('keeps everything else out of it', () => {
    for (const role of ['SUPER_ADMIN', 'USER', '', null, undefined, 42]) {
      expect(isDashboardRole(role)).toBe(false);
    }
  });

  it('tells the organization account from a company one', () => {
    expect(isOrganizationRole('ORG_ADMIN')).toBe(true);
    expect(isOrganizationRole('ADMIN')).toBe(false);
    expect(isOrganizationRole('SUPER_ADMIN')).toBe(false);
  });
});
