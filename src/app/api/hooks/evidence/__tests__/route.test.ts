import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from '../route';
import * as icommunity from '@/lib/icommunity';

vi.mock('@/lib/icommunity', () => {
  return {
    applyEvidenceCertifiedWebhook: vi.fn(async () => {}),
  };
});

describe('webhook evidence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to applyEvidenceCertifiedWebhook and returns 200', async () => {
    const body = { data: { evidence_id: 'ev_1', certification_timestamp: new Date().toISOString() } };
    const req = new NextRequest('http://localhost/api/hooks/evidence', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any);

    const res = await (route as any).POST(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(icommunity.applyEvidenceCertifiedWebhook).toHaveBeenCalledWith(body);
  });

  it('returns 500 when underlying handler throws', async () => {
    (icommunity.applyEvidenceCertifiedWebhook as any).mockRejectedValueOnce(new Error('boom'));
    const body = { data: { evidence_id: 'ev_2' } };
    const req = new NextRequest('http://localhost/api/hooks/evidence', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any);

    const res = await (route as any).POST(req);
    expect(res.status).toBe(500);
  });
});
