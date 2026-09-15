import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from '../route';
import { requireOrganizationId, TenantContextNotFoundError } from '@/lib/auth/tenant';
import { getStorage } from '@/lib/storage';

vi.mock('@/lib/auth/tenant', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth/tenant')>('@/lib/auth/tenant');
  return { ...actual, requireOrganizationId: vi.fn(async () => 'org-1') };
});

const getSize = vi.fn(async () => 1000);
vi.mock('@/lib/storage', () => ({ getStorage: vi.fn(() => ({ getSize })) }));
vi.mock('@/lib/env', () => ({ getDynamicAppUrl: vi.fn(async () => 'https://datia.test') }));

const post = (body: unknown) =>
  (route as any).POST(
    new NextRequest('http://localhost/api/issues/preflight', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any)
  );

describe('POST /api/issues/preflight', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses without a session and fetches nothing', async () => {
    (requireOrganizationId as any).mockRejectedValueOnce(new TenantContextNotFoundError('no session'));

    const res = await post({ imageUrls: ['http://169.254.169.254/computeMetadata/v1/'] });

    expect(res.status).toBe(401);
    expect(getStorage).not.toHaveBeenCalled();
    expect(getSize).not.toHaveBeenCalled();
  });

  it('estimates the payload for a signed-in user', async () => {
    const res = await post({ imageUrls: ['/uploads/a.png'], description: 'ab' });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(getSize).toHaveBeenCalledWith('https://datia.test/uploads/a.png');
    expect(json).toMatchObject({ totalBytes: 1002, overLimit: false });
  });
});
