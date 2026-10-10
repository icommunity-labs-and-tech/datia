import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';

/**
 * The audience ties a verified assertion to this one backend service — a
 * genuine IAP JWT signed for a different resource must be refused just as
 * firmly as a forged one.
 */

const { mockJwtVerify } = vi.hoisted(() => ({ mockJwtVerify: vi.fn() }));

vi.mock('jose', () => ({
  createRemoteJWKSet: vi.fn(() => 'jwks-handle'),
  jwtVerify: mockJwtVerify,
}));

const { verifiedIapEmail } = await import('../iap');

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('IAP_AUDIENCE', '/projects/818627151997/global/backendServices/234053893634737370');
});
afterEach(() => vi.unstubAllEnvs());

describe('verifiedIapEmail', () => {
  it('returns the verified email for a genuine assertion', async () => {
    mockJwtVerify.mockResolvedValue({ payload: { email: 'a@icommunity.io' } });
    await expect(verifiedIapEmail('a-jwt')).resolves.toBe('a@icommunity.io');
    expect(mockJwtVerify).toHaveBeenCalledWith(
      'a-jwt',
      'jwks-handle',
      expect.objectContaining({
        issuer: 'https://cloud.google.com/iap',
        audience: '/projects/818627151997/global/backendServices/234053893634737370',
      })
    );
  });

  it('is null with no assertion at all', async () => {
    await expect(verifiedIapEmail(null)).resolves.toBeNull();
    await expect(verifiedIapEmail(undefined)).resolves.toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('is null when verification fails — wrong audience, expired, forged, anything', async () => {
    mockJwtVerify.mockRejectedValue(new Error('signature verification failed'));
    await expect(verifiedIapEmail('a-jwt')).resolves.toBeNull();
  });

  it('is null, not an open door, when IAP_AUDIENCE is not configured', async () => {
    vi.stubEnv('IAP_AUDIENCE', '');
    await expect(verifiedIapEmail('a-jwt')).resolves.toBeNull();
    expect(mockJwtVerify).not.toHaveBeenCalled();
  });

  it('is null when the verified token carries no email claim', async () => {
    mockJwtVerify.mockResolvedValue({ payload: {} });
    await expect(verifiedIapEmail('a-jwt')).resolves.toBeNull();
  });
});
