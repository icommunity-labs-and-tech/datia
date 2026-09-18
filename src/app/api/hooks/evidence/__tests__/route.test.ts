import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import * as route from '../route';
import * as anchor from '@/lib/certification';

vi.mock('@/lib/certification', () => ({
  applyCertification: vi.fn(async () => ({ certification: { id: 'cert_1' } })),
}));

const post = (body: unknown) =>
  (route as any).POST(
    new NextRequest('http://localhost/api/hooks/evidence', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any)
  );

describe('webhook evidence route', () => {
  beforeEach(() => vi.clearAllMocks());

  it('applies the certification of the evidence iBS reports', async () => {
    const res = await post({
      data: { evidence_id: 'ev_1', certification_timestamp: new Date().toISOString() },
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, applied: true });
    expect(anchor.applyCertification).toHaveBeenCalledWith('ev_1');
  });

  it('accepts the id at the top level too', async () => {
    await post({ evidence_id: 'ev_2' });
    expect(anchor.applyCertification).toHaveBeenCalledWith('ev_2');
  });

  it('rejects a payload with no evidence id', async () => {
    const res = await post({ data: {} });
    expect(res.status).toBe(400);
    expect(anchor.applyCertification).not.toHaveBeenCalled();
  });

  it('acknowledges an evidence it does not know about', async () => {
    // Not a delivery failure, and a retry would not change the outcome: replying
    // with an error would only make iBS redeliver something unresolvable.
    (anchor.applyCertification as any).mockResolvedValueOnce(null);
    const res = await post({ data: { evidence_id: 'ev_desconocida' } });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toMatchObject({ success: true, applied: false });
  });

  it('reports a genuine failure, so iBS retries', async () => {
    (anchor.applyCertification as any).mockRejectedValueOnce(new Error('boom'));
    const res = await post({ data: { evidence_id: 'ev_3' } });
    expect(res.status).toBe(500);
  });
});
