'use server';
import 'server-only';

export type EvidenceFile = { name: string; file: string };
import { prisma } from '@/lib/prisma';

const BASE_URL = 'https://api.icommunitylabs.com/v2';

function getAuthHeaders(): HeadersInit {
  const token = process.env.IBS_TOKEN;
  if (!token) throw new Error('IBS_TOKEN is not configured');
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
      // not json
      return undefined as unknown as T;
    }
  };

  if (!res.ok) {
    const body = await parse();
    throw new Error(`iCommunity API error ${res.status} ${res.statusText}: ${JSON.stringify(body)}`);
  }

  return (await parse()) as T;
}

// (type-only export done inline above)

// Interface + Client implementation (extensible)
export interface ICommunityClient {
  createSignature(signatureName: string, okUrl?: string, koUrl?: string): Promise<{ signature_id: string; url?: string }>;
  retrySignature(signatureID: string): Promise<{ url?: string }>;
  createEvidence(signatureID: string, title: string, files: EvidenceFile[]): Promise<string>;
}

class CommunityApiClient implements ICommunityClient {
  async createSignature(signatureName: string, okUrl?: string, koUrl?: string): Promise<{ signature_id: string; url?: string }> {
    const body: Record<string, unknown> = { 
      signature_name: signatureName 
    };

    // Add wizard fields if URLs are provided
    if (okUrl || koUrl) {
      body.wizard = {
        ...(okUrl && { ok_url: okUrl }),
        ...(koUrl && { ko_url: koUrl })
      };
    }

    const res = await request<{ signature_id: string; url?: string }>(`/signatures`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res;
  }

  async retrySignature(signatureID: string): Promise<{ url?: string }> {
    const res = await request<{ url?: string }>(`/signatures/${signatureID}`, {
      method: 'PUT',
    });
    return res;
  }

  async createEvidence(signatureID: string, title: string, files: EvidenceFile[]): Promise<string> {
    const payload = {
      payload: {
        title,
        files,
      },
      signatures: [{ id: signatureID }],
    };
    const res = await request<{ evidence_id?: string; id?: string }>(`/evidences`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.evidence_id || res.id || '';
  }
}

let currentClient: ICommunityClient | null = null;
export async function getICommunityClient(): Promise<ICommunityClient> {
  if (!currentClient) currentClient = new CommunityApiClient();
  return currentClient;
}

// Backwards-compatible function exports
export async function createSignature(signatureName: string, okUrl?: string, koUrl?: string) {
  const client = await getICommunityClient();
  return client.createSignature(signatureName, okUrl, koUrl);
}
export async function retrySignature(signatureID: string) {
  const client = await getICommunityClient();
  return client.retrySignature(signatureID);
}
export async function createEvidence(signatureID: string, title: string, files: EvidenceFile[]) {
  const client = await getICommunityClient();
  return client.createEvidence(signatureID, title, files);
}
