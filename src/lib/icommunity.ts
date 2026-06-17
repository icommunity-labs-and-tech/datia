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
  applySignatureStatusFromWebhook(status: 'ok' | 'ko', body: SignatureWebhookPayload): Promise<void>;
  applyEvidenceCertifiedWebhook(body: EvidenceCertifiedWebhookPayload): Promise<void>;
}

export type SignatureWebhookPayload = {
  data?: { signature_id?: string };
  signature_id?: string;
};

export type EvidenceCertifiedWebhookPayload = {
  data?: { evidence_id?: string; certification_timestamp?: string };
};

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

  async applySignatureStatusFromWebhook(status: 'ok' | 'ko', body: SignatureWebhookPayload): Promise<void> {
    const signatureId: string | undefined = body?.data?.signature_id || body?.signature_id;
    if (!signatureId) throw new Error('signature_id missing in webhook payload');
    const verificationStatus = status === 'ok' ? 'VERIFIED' : 'REJECTED';
    // Update organization instead of user
    await prisma.organization.updateMany({
      where: { signatureID: signatureId },
      data: { verificationStatus },
    });
  }

  async applyEvidenceCertifiedWebhook(body: EvidenceCertifiedWebhookPayload): Promise<void> {
    const evidenceId: string | undefined = body?.data?.evidence_id;
    const ts: string | undefined = body?.data?.certification_timestamp;
    if (!evidenceId) throw new Error('evidence_id missing in webhook payload');
    await prisma.state.updateMany({
      where: { evidenceID: evidenceId },
      data: {
        backed: true,
        backedAt: ts ? new Date(ts) : new Date(),
      },
    });
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
export async function applySignatureStatusFromWebhook(status: 'ok' | 'ko', body: SignatureWebhookPayload) {
  const client = await getICommunityClient();
  return client.applySignatureStatusFromWebhook(status, body);
}

export async function applyEvidenceCertifiedWebhook(body: EvidenceCertifiedWebhookPayload) {
  const client = await getICommunityClient();
  return client.applyEvidenceCertifiedWebhook(body);
}


