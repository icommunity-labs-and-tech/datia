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
  event: string;
  data: Record<string, any>;
  timestamp: string;
  organizationId: string;
}

export interface TriggerWebhookResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

function calculateSignature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

async function triggerWebhookWithRetry(
  url: string,
  payload: WebhookPayload,
  secret: string | null | undefined,
  customHeaders: Record<string, string> | null | undefined,
  maxRetries: number = 3
): Promise<TriggerWebhookResult> {
  const payloadString = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'certypass-Webhooks/1.0',
    'X-Webhook-Timestamp': new Date().toISOString(),
    ...(customHeaders || {}),
  };

  // Add signature if secret is provided
  if (secret) {
    const signature = calculateSignature(payloadString, secret);
    headers['X-Webhook-Signature'] = `sha256=${signature}`;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payloadString,
        // Timeout after 10 seconds
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
        };
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        lastError = new Error(`HTTP ${response.status}: ${errorText}`);
        
        // Don't retry on client errors (4xx), only on server errors (5xx)
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            statusCode: response.status,
            error: lastError.message,
          };
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort/timeout on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: wait 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  return {
    success: false,
    error: lastError?.message || 'Unknown error',
  };
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
