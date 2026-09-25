import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequest, mockReset, mockValid } = vi.hoisted(() => ({
  mockRequest: vi.fn(),
  mockReset: vi.fn(),
  mockValid: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.7' }),
}));
vi.mock('@/lib/env', () => ({ getDynamicAppUrl: async () => 'https://datia.test' }));
vi.mock('@/lib/auth/password-reset', () => ({
  requestPasswordReset: mockRequest,
  resetPassword: mockReset,
  isResetTokenValid: mockValid,
}));

import { requestPasswordResetAction, resetPasswordAction } from '@/actions/auth/password-reset';

beforeEach(() => vi.clearAllMocks());

describe('requestPasswordResetAction', () => {
  it('answers the same whatever happens behind it, without waiting for it', async () => {
    mockRequest.mockReturnValue(new Promise(() => {})); // an email that never finishes sending
    expect(await requestPasswordResetAction('ana@x.test', 'en')).toEqual({ success: true });
    expect(mockRequest).toHaveBeenCalledWith({ email: 'ana@x.test', appUrl: 'https://datia.test', language: 'en' });
  });

  it('does not let a failure behind it reach the caller', async () => {
    mockRequest.mockRejectedValue(new Error('Mailgun caído'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(await requestPasswordResetAction('ana@x.test')).toEqual({ success: true });
  });

  it('slows down an address that keeps asking', async () => {
    // The counter lives in the module: a fresh one, not what the tests above used.
    vi.resetModules();
    const { requestPasswordResetAction: fresh } = await import('@/actions/auth/password-reset');
    mockRequest.mockResolvedValue(undefined);
    const answers = [];
    for (let i = 0; i < 12; i++) answers.push(await fresh(`a${i}@x.test`));

    expect(answers.filter((a) => a.success)).toHaveLength(10);
    expect(answers.at(-1)).toEqual({ success: false, error: 'rate_limited' });
  });
});

describe('resetPasswordAction', () => {
  it('passes the token and the password on', async () => {
    mockReset.mockResolvedValue({ success: true });
    expect(await resetPasswordAction('tok', 'una-contraseña-larga')).toEqual({ success: true });
    expect(mockReset).toHaveBeenCalledWith({ token: 'tok', password: 'una-contraseña-larga' });
  });
});
