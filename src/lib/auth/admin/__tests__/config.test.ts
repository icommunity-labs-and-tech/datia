import { describe, it, expect, vi, afterEach } from 'vitest';
import { adminAuthConfig, getAdminJwtSecret } from '../config';

describe('admin JWT secret', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('refuses the built-in default in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DASHBOARD_JWT_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');

    expect(() => getAdminJwtSecret()).toThrow(/must be set in production/);
    expect(() => adminAuthConfig.jwtSecret).toThrow(/must be set in production/);
  });

  it('uses DASHBOARD_JWT_SECRET first, then JWT_SECRET', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DASHBOARD_JWT_SECRET', 'dashboard-secret');
    vi.stubEnv('JWT_SECRET', 'shared-secret');
    expect(adminAuthConfig.jwtSecret).toBe('dashboard-secret');

    vi.stubEnv('DASHBOARD_JWT_SECRET', '');
    expect(adminAuthConfig.jwtSecret).toBe('shared-secret');
  });

  it('keeps the default outside production so local development needs no setup', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DASHBOARD_JWT_SECRET', '');
    vi.stubEnv('JWT_SECRET', '');

    expect(getAdminJwtSecret()).toBe('fallback-admin-secret');
  });
});
