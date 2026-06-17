import { ICommunityService, type EvidenceFile, type EvidenceData } from './ICommunityService';
import { ICommunityConfigError, ICommunityHTTPError } from './errors';

const BASE_URL = 'https://api.icommunitylabs.com/v2';

function getAuthHeaders(): HeadersInit {
  const token = process.env.IBS_TOKEN;
  if (!token) {
    throw new ICommunityConfigError('IBS_TOKEN is not configured');
  }
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { ...(init.headers || {}), ...getAuthHeaders() },
  });

  const parse = async () => {
    try {
      return (await res.json()) as T;
    } catch {
      return undefined as unknown as T;
    }
  };

  if (!res.ok) {
    const body = await parse();
    throw new ICommunityHTTPError(
      'createEvidence', // Overridden per method
      `iCommunity API error ${res.status} ${res.statusText}: ${JSON.stringify(body)}`,
      res.status,
      body
    );
  }

  return (await parse()) as T;
}

async function requestWithRetry<T>(
  operation: 'createEvidence' | 'createSignature' | 'retrySignature' | 'getEvidence',
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on last attempt
      if (attempt === maxRetries - 1) {
        break;
      }
      
      // Exponential backoff: 200ms, 400ms, 800ms
      const delay = Math.pow(2, attempt) * 200;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  
  // Re-throw with proper error type
  if (lastError instanceof ICommunityConfigError || lastError instanceof ICommunityHTTPError) {
    throw lastError;
  }
  
  throw new ICommunityHTTPError(
    operation,
    `Unexpected error: ${lastError?.message || String(lastError)}`
  );
}

export function createICommunityService(): ICommunityService {
  return {
    async createEvidence(signatureID: string, title: string, files: EvidenceFile[]): Promise<string> {
      return requestWithRetry('createEvidence', async () => {
        try {
          const payload = {
            payload: {
              title,
              files,
            },
            signatures: [{ id: signatureID }],
          };
          
          const result = await request<{ evidence_id?: string; id?: string }>('/evidences', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          
          return result.evidence_id || result.id || '';
        } catch (error) {
          if (error instanceof ICommunityConfigError) throw error;
          if (error instanceof ICommunityHTTPError) {
            throw new ICommunityHTTPError(
              'createEvidence',
              error.message,
              error.status,
              error.response
            );
          }
          throw new ICommunityHTTPError(
            'createEvidence',
            `Unexpected error: ${error}`
          );
        }
      });
    },

    async createSignature(name: string, okUrl?: string, koUrl?: string): Promise<{ signature_id: string; url?: string }> {
      return requestWithRetry('createSignature', async () => {
        try {
          const body: Record<string, unknown> = { 
            signature_name: name 
          };

          if (okUrl || koUrl) {
            body.wizard = {
              ...(okUrl && { ok_url: okUrl }),
              ...(koUrl && { ko_url: koUrl })
            };
          }

          const result = await request<{ signature_id: string; url?: string }>('/signatures', {
            method: 'POST',
            body: JSON.stringify(body),
          });
          
          return result;
        } catch (error) {
          if (error instanceof ICommunityConfigError) throw error;
          if (error instanceof ICommunityHTTPError) {
            throw new ICommunityHTTPError(
              'createSignature',
              error.message,
              error.status,
              error.response
            );
          }
          throw new ICommunityHTTPError(
            'createSignature',
            `Unexpected error: ${error}`
          );
        }
      });
    },

    async retrySignature(signatureId: string): Promise<{ url?: string }> {
      return requestWithRetry('retrySignature', async () => {
        try {
          const result = await request<{ url?: string }>(`/signatures/${signatureId}/retry`, {
            method: 'POST',
            body: JSON.stringify({}),
          });
          return result;
        } catch (error) {
          if (error instanceof ICommunityConfigError) throw error;
          if (error instanceof ICommunityHTTPError) {
            throw new ICommunityHTTPError(
              'retrySignature',
              error.message,
              error.status,
              error.response
            );
          }
          throw new ICommunityHTTPError(
            'retrySignature',
            `Unexpected error: ${error}`
          );
        }
      });
    },

    async getEvidence(evidenceId: string): Promise<EvidenceData> {
      return requestWithRetry('getEvidence', async () => {
        try {
          const result = await request<any>(`/evidences/${evidenceId}`, { method: 'GET' });
          return result;
        } catch (error) {
          if (error instanceof ICommunityConfigError) throw error;
          if (error instanceof ICommunityHTTPError) {
            throw new ICommunityHTTPError(
              'getEvidence',
              error.message,
              error.status,
              error.response
            );
          }
          throw new ICommunityHTTPError(
            'getEvidence',
            `Unexpected error: ${error}`
          );
        }
      });
    },
  };
}

export const icommunityService = createICommunityService();
