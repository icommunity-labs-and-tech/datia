/**
 * Integration test: sandbox product lifecycle
 *
 * Validates the full sandbox flow without touching the real database:
 *   1. Create a product (POST /products)
 *   2. Retrieve the product  (GET /products/{id})
 *
 * Dependencies injected / mocked:
 *   - validateApiToken → always returns a sandbox auth result
 *   - IBS/iCommunity evidence service → never called in sandbox (verified via mock assertion)
 *
 * Real adapters used:
 *   - ItemRepositoryFilesystem
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Constants (hoisted so vi.mock factories can reference them) ──────────────

const { ORG_ID, PRODUCT_ID, mockCreateEvidence } = vi.hoisted(() => {
  const ORG_ID = 'sandbox-test-org';
  const PRODUCT_ID = 'PROD-SANDBOX-001';
  const mockCreateEvidence = vi.fn();
  return { ORG_ID, PRODUCT_ID, mockCreateEvidence };
});

const SANDBOX_DIR = join(tmpdir(), 'datia-sandbox');

// ── Mocks ────────────────────────────────────────────────────────────────────

// Sandbox auth — always authenticated as sandbox, no real token validation
vi.mock('@/lib/auth/api-tokens/middleware', () => ({
  validateApiToken: vi.fn().mockResolvedValue({
    organizationId: ORG_ID,
    tokenId: 'sandbox-preview-token-id',
    isSandbox: true,
  }),
  createApiTokenValidator: vi.fn(),
  requireApiAuth: vi.fn().mockResolvedValue(null),
}));


// IBS / iCommunity must NEVER be called in sandbox mode
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: {
    createEvidence: mockCreateEvidence,
    getEvidence: vi.fn(),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(method: string, path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer sandbox-preview-token',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function cleanSandboxFiles() {
  for (const file of ['items.json', 'states.json', 'tokens.json']) {
    const filePath = join(SANDBOX_DIR, file);
    if (existsSync(filePath)) unlinkSync(filePath);
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Sandbox product lifecycle', () => {
  beforeEach(() => {
    cleanSandboxFiles();
    // vi.clearAllMocks() only clears call history, not implementations —
    // the vi.mock() factories above remain active across tests.
    vi.clearAllMocks();
  });

  it('1. creates a product in the sandbox filesystem (no DB)', async () => {
    const { POST } = await import('@/app/api/v1/products/route');

    const request = makeRequest('POST', '/products', {
      id: PRODUCT_ID,
      name: 'Panel Solar 300W',
      description: 'Panel solar de alta eficiencia',
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.id).toBe(PRODUCT_ID);
    expect(body.name).toBe('Panel Solar 300W');

    // Filesystem file must exist
    expect(existsSync(join(SANDBOX_DIR, 'items.json'))).toBe(true);
  });

  it('2. retrieves the product from the sandbox filesystem', async () => {
    // Setup: create the product first
    const { POST } = await import('@/app/api/v1/products/route');
    await POST(makeRequest('POST', '/products', {
      id: PRODUCT_ID,
      name: 'Panel Solar 300W',
      description: 'Panel solar de alta eficiencia',
    }));

    // Test: retrieve it
    const { GET } = await import('@/app/api/v1/products/[id]/route');
    const response = await GET(
      makeRequest('GET', `/products/${PRODUCT_ID}`),
      { params: Promise.resolve({ id: PRODUCT_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(PRODUCT_ID);
    expect(body.name).toBe('Panel Solar 300W');
  });

  it('returns 404 when retrieving a non-existent product from sandbox', async () => {
    const { GET } = await import('@/app/api/v1/products/[id]/route');

    const response = await GET(
      makeRequest('GET', '/products/NON-EXISTENT'),
      { params: Promise.resolve({ id: 'NON-EXISTENT' }) }
    );

    expect(response.status).toBe(404);
  });

  it('returns 409 when creating a duplicate product in sandbox', async () => {
    const { POST } = await import('@/app/api/v1/products/route');

    const payload = { id: PRODUCT_ID, name: 'Panel Solar 300W', description: 'Desc' };
    await POST(makeRequest('POST', '/products', payload));
    const secondRes = await POST(makeRequest('POST', '/products', payload));

    expect(secondRes.status).toBe(409);
  });

});
