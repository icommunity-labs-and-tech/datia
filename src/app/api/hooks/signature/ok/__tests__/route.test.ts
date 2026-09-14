import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from '../route';
import * as verification from '@/lib/kyc/signature-verification';

vi.mock('@/lib/kyc/signature-verification', () => ({
  applySignatureVerification: vi.fn(async () => true),
}));

const post = (body: unknown) =>
  (route as any).POST(
    new NextRequest('http://localhost/api/hooks/signature/ok', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any)
  );

describe('webhook signature ok route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('passes only the signature id on, whatever else the body claims', async () => {
    const res = await post({ event: 'signature.verification.success', data: { signature_id: 'sig_1', status: 'success' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, applied: true });
    expect(verification.applySignatureVerification).toHaveBeenCalledWith('sig_1');
  });

  it('accepts the legacy top-level signature_id', async () => {
    await post({ signature_id: 'sig_2' });
    expect(verification.applySignatureVerification).toHaveBeenCalledWith('sig_2');
  });

  it('returns 400 without a signature id', async () => {
    const res = await post({ data: {} });
    expect(res.status).toBe(400);
    expect(verification.applySignatureVerification).not.toHaveBeenCalled();
  });

  it('returns 500 when iBS cannot be asked', async () => {
    (verification.applySignatureVerification as any).mockRejectedValueOnce(new Error('boom'));
    const res = await post({ data: { signature_id: 'sig_3' } });
    expect(res.status).toBe(500);
  });
});
