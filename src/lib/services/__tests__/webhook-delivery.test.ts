import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { triggerWebhookWithRetry, signWebhookPayload, type WebhookPayload } from '../webhook';

const payload: WebhookPayload = {
  id: 'evt-1',
  event: 'item.created',
  entityType: 'item',
  entityId: 'i-1',
  data: { id: 'i-1' },
  timestamp: '2026-09-15T10:00:00.000Z',
  organizationId: 'org-1',
};

const response = (status: number) => new Response(status < 300 ? 'ok' : 'fail', { status });
const sleep = vi.fn(async (_ms: number) => {});
const options = { sleep, now: () => 1_700_000_000_000 };

describe('triggerWebhookWithRetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock as any;
    sleep.mockClear();
  });

  it('signs the timestamp together with the body', async () => {
    fetchMock.mockResolvedValueOnce(response(200));

    const result = await triggerWebhookWithRetry('https://hook.test', payload, 's3cret', null, options);

    expect(result).toMatchObject({ success: true, statusCode: 200, attempts: 1 });
    const [, init] = fetchMock.mock.calls[0];
    const expected = crypto.createHmac('sha256', 's3cret').update(`1700000000000.${init.body}`).digest('hex');
    expect(init.headers['X-Webhook-Timestamp']).toBe('1700000000000');
    expect(init.headers['X-Webhook-Signature']).toBe(`sha256=${expected}`);
    expect(init.headers['X-Webhook-Id']).toBe('evt-1');
    expect(signWebhookPayload('s3cret', '1700000000000', init.body)).toBe(expected);
    expect(JSON.parse(init.body)).toEqual(payload);
  });

  it('does not let custom headers replace the ones a receiver verifies', async () => {
    fetchMock.mockResolvedValueOnce(response(200));

    await triggerWebhookWithRetry(
      'https://hook.test',
      payload,
      's3cret',
      { 'X-Webhook-Signature': 'forged', 'X-Webhook-Timestamp': '1', Authorization: 'Bearer abc' },
      options
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['X-Webhook-Signature']).not.toBe('forged');
    expect(init.headers['X-Webhook-Timestamp']).toBe('1700000000000');
    expect(init.headers.Authorization).toBe('Bearer abc');
  });

  it('sends no signature without a secret', async () => {
    fetchMock.mockResolvedValueOnce(response(200));
    await triggerWebhookWithRetry('https://hook.test', payload, null, null, options);
    expect(fetchMock.mock.calls[0][1].headers['X-Webhook-Signature']).toBeUndefined();
  });

  it('retries server errors with growing waits until one succeeds', async () => {
    fetchMock.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(429)).mockResolvedValueOnce(response(200));

    const result = await triggerWebhookWithRetry('https://hook.test', payload, null, null, options);

    expect(result).toMatchObject({ success: true, attempts: 3 });
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it('retries network failures', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValueOnce(response(200));

    const result = await triggerWebhookWithRetry('https://hook.test', payload, null, null, options);

    expect(result).toMatchObject({ success: true, attempts: 2 });
    expect(sleep.mock.calls).toEqual([[1000]]);
  });

  it('gives up at once on a client error', async () => {
    fetchMock.mockResolvedValueOnce(response(410));

    const result = await triggerWebhookWithRetry('https://hook.test', payload, null, null, options);

    expect(result).toMatchObject({ success: false, statusCode: 410, attempts: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('reports the last failure once the attempts run out', async () => {
    fetchMock.mockResolvedValue(response(500));

    const result = await triggerWebhookWithRetry('https://hook.test', payload, null, null, options);

    expect(result).toMatchObject({ success: false, statusCode: 500, attempts: 3 });
    expect(result.error).toMatch(/HTTP 500/);
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
