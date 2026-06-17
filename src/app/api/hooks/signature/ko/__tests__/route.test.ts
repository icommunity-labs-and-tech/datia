import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from '../route';
import * as icommunity from '@/lib/icommunity';

vi.mock('@/lib/icommunity', () => {
  return {
    applySignatureStatusFromWebhook: vi.fn(async () => {}),
  };
});

describe('webhook signature ko route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to applySignatureStatusFromWebhook("ko") and returns 200', async () => {
    const body = { data: { signature_id: 'sig_3' } };
    const req = new NextRequest('http://localhost/api/hooks/signature/ko', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any);

    const res = await (route as any).POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(icommunity.applySignatureStatusFromWebhook).toHaveBeenCalledWith('ko', body);
  });

  it('returns 500 when underlying handler throws', async () => {
    (icommunity.applySignatureStatusFromWebhook as any).mockRejectedValueOnce(new Error('boom'));
    const body = { data: { signature_id: 'sig_4' } };
    const req = new NextRequest('http://localhost/api/hooks/signature/ko', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any);

    const res = await (route as any).POST(req);
    expect(res.status).toBe(500);
  });
});
