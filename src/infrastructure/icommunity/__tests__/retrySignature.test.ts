import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createICommunityService } from '../ICommunityServiceImpl';

describe('icommunityService.retrySignature', () => {
  beforeEach(() => {
    process.env.IBS_TOKEN = 'test-token';
  });

  it('restarts the signature with PUT /v2/signatures/{id} and returns the wizard URL', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ url: 'https://dashboard.icommunitylabs.com/identity/abc' }), { status: 200 })
    );
    global.fetch = fetchMock as any;

    const result = await createICommunityService().retrySignature('sig_ABCDEFGHIJKLMNOPQRSTUV');

    expect(result).toEqual({ url: 'https://dashboard.icommunitylabs.com/identity/abc' });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.icommunitylabs.com/v2/signatures/sig_ABCDEFGHIJKLMNOPQRSTUV');
    expect(init.method).toBe('PUT');
  });

  it('keeps an odd id inside one path segment', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    global.fetch = fetchMock as any;

    await createICommunityService().retrySignature('sig_x/../evidences');

    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      'https://api.icommunitylabs.com/v2/signatures/sig_x%2F..%2Fevidences'
    );
  });
});
