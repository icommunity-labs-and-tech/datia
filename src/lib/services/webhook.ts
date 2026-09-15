import type { VerifyOptions } from '../webhook/types';
import { WebhookConfigError, WebhookParseError, WebhookSignatureInvalid, WebhookTimestampSkew, WebhookIdempotencyError } from '../webhook/errors';
import * as crypto from 'crypto';

export interface WebhookService {
  verifyAndParse<T>(args: {
    headers: Record<string, string | null | undefined>;
    rawBody: string;
    schema: { parse: (x: unknown) => T };
    secretEnv: string; // env var name for secret
    opts: VerifyOptions;
  }): Promise<{ payload: unknown; event: T }>;

  ensureIdempotent(key: string): Promise<void>;
}

function hmacSha256Hex(secret: string, content: string): string {
  return crypto.createHmac('sha256', secret).update(content, 'utf8').digest('hex');
}

const defaultMaxSkew = 5 * 60 * 1000;

// Simple in-memory idempotency set (process scoped)
const seen = new Set<string>();

export function createWebhookService(): WebhookService {
  return {
    async verifyAndParse<T>(args: {
      headers: Record<string, string | null | undefined>;
      rawBody: string;
      schema: { parse: (x: unknown) => T };
      secretEnv: string;
      opts: VerifyOptions;
    }): Promise<{ payload: unknown; event: T }> {
      const { headers, rawBody, schema, secretEnv, opts } = args;
      
      const secret = process.env[secretEnv];
      if (!secret) {
        throw new WebhookConfigError(`${secretEnv} not configured`);
      }

      const sig = headers[opts.signatureHeader]?.toString() ?? '';
      const tsStr = headers[opts.timestampHeader]?.toString() ?? '';
      const ts = Number(tsStr);
      if (!ts || Number.isNaN(ts)) {
        throw new WebhookSignatureInvalid('Missing or invalid timestamp');
      }
      
      const now = Date.now();
      const maxSkew = opts.maxSkewMs ?? defaultMaxSkew;
      if (Math.abs(now - ts) > maxSkew) {
        throw new WebhookTimestampSkew(
          'Timestamp skew',
          Math.abs(now - ts)
        );
      }

      const expected = hmacSha256Hex(secret, `${ts}.${rawBody}`);
      if (!sig || sig !== expected) {
        throw new WebhookSignatureInvalid('Invalid signature');
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawBody);
      } catch {
        throw new WebhookParseError('Invalid JSON');
      }
      
      const event = schema.parse(parsed) as T;
      return { payload: parsed, event };
    },

    async ensureIdempotent(key: string): Promise<void> {
      if (seen.has(key)) {
        throw new WebhookIdempotencyError('Duplicate event');
      }
      seen.add(key);
    },
  };
}

export const webhookService = createWebhookService();

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

export function createWebhookTriggerService(): WebhookTriggerService {
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
