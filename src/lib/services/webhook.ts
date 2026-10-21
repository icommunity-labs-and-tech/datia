import * as crypto from 'crypto';

// Webhook trigger service (for sending webhooks)
export interface WebhookPayload {
  /** EventLog id: the same on every retry, so a receiver can drop duplicates. */
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  data: Record<string, any>;
  timestamp: string;
  organizationId: string;
}

export interface TriggerWebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  attempts: number;
}

export interface TriggerWebhookOptions {
  maxAttempts?: number;
  timeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * HMAC-SHA256 of `${timestamp}.${body}`. The timestamp is part of what is signed,
 * so a captured request cannot be replayed later under a fresh header; receivers
 * should also reject timestamps too far from their own clock.
 */
export function signWebhookPayload(secret: string, timestamp: string, body: string): string {
  return crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`, 'utf8').digest('hex');
}

const isRetryableStatus = (status: number) => status >= 500 || status === 429;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Posts the payload, retrying server errors, 429 and network failures with waits
 * of 1 s, 2 s, 4 s… Any other 4xx is final: sending it again would not change it.
 */
export async function triggerWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  secret: string | null | undefined,
  customHeaders: Record<string, string> | null | undefined,
  options: TriggerWebhookOptions = {}
): Promise<TriggerWebhookResult> {
  const { maxAttempts = 3, timeoutMs = 10_000, sleep = wait, now = Date.now } = options;
  const body = JSON.stringify(payload);
  let lastError = 'Unknown error';
  let statusCode: number | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const timestamp = String(now());
    const headers: Record<string, string> = {
      // Custom headers go first so they cannot replace the ones a receiver verifies.
      ...(customHeaders || {}),
      'Content-Type': 'application/json',
      'User-Agent': 'datia-Webhooks/1.0',
      'X-Webhook-Id': payload.id,
      'X-Webhook-Timestamp': timestamp,
    };
    if (secret) {
      headers['X-Webhook-Signature'] = `sha256=${signWebhookPayload(secret, timestamp, body)}`;
    }

    let retryable = true;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
      statusCode = response.status;
      if (response.ok) {
        return { success: true, statusCode, attempts: attempt };
      }
      const text = await response.text().catch(() => '');
      lastError = `HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
      retryable = isRetryableStatus(response.status);
    } catch (error) {
      statusCode = undefined;
      lastError = error instanceof Error ? error.message : String(error);
    }

    if (!retryable || attempt === maxAttempts) {
      return { success: false, statusCode, error: lastError, attempts: attempt };
    }
    await sleep(2 ** (attempt - 1) * 1000);
  }

  return { success: false, statusCode, error: lastError, attempts: maxAttempts };
}

export interface WebhookTriggerService {
  triggerWebhook(
    url: string,
    payload: WebhookPayload,
    secret?: string | null,
    headers?: Record<string, string> | null
  ): Promise<TriggerWebhookResult>;
}

function createWebhookTriggerService(): WebhookTriggerService {
  return {
    async triggerWebhook(
      url: string,
      payload: WebhookPayload,
      secret?: string | null,
      headers?: Record<string, string> | null
    ): Promise<TriggerWebhookResult> {
      return triggerWebhookWithRetry(url, payload, secret, headers);
    },
  };
}

export const webhookTriggerService = createWebhookTriggerService();
