/**
 * Integration test: sandbox product lifecycle
 *
 * Validates the full sandbox flow without touching the real database:
 *   1. Create a product (POST /products)
 *   2. Retrieve the product  (GET /products/{id})
 *   3. Add a state           (POST /products/{id}/states)
 *   4. Verify the state      (filesystem assertion)
 *
 * Dependencies injected / mocked:
 *   - validateApiToken → always returns a sandbox auth result
 *   - statusTypeRepository → returns an in-memory fake status type
 *   - IBS/iCommunity evidence service → never called in sandbox (verified via mock assertion)
 *
 * Real adapters used:
 *   - ItemRepositoryFilesystem
 *   - StateRepositoryFilesystem
 */

import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── Constants (hoisted so vi.mock factories can reference them) ──────────────

const { ORG_ID, PRODUCT_ID, STATUS_TYPE_ID, fakeStatusType, mockCreateEvidence } = vi.hoisted(() => {
  const ORG_ID = 'sandbox-test-org';
  const PRODUCT_ID = 'PROD-SANDBOX-001';
  const STATUS_TYPE_ID = 'st-verified-001';
  const fakeStatusType = {
    id: STATUS_TYPE_ID,
    name: 'Verificado',
    description: 'El producto ha sido verificado',
    template: [
      { name: 'inspector', type: 'text', required: true },
      { name: 'score', type: 'number', required: false },
    ],
    organizationId: ORG_ID,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };
  const mockCreateEvidence = vi.fn();
  return { ORG_ID, PRODUCT_ID, STATUS_TYPE_ID, fakeStatusType, mockCreateEvidence };
});

const SANDBOX_DIR = join(tmpdir(), 'certypass-sandbox');

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

vi.mock('@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma', () => ({
  statusTypeRepository: {
    getById: vi.fn().mockResolvedValue(fakeStatusType),
    findByOrganization: vi.fn().mockResolvedValue([fakeStatusType]),
    findDuplicateInOrganization: vi.fn().mockResolvedValue(false),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    countStates: vi.fn().mockResolvedValue(0),
    findAll: vi.fn().mockResolvedValue([]),
  },
}));

// IBS / iCommunity must NEVER be called in sandbox mode
vi.mock('@/infrastructure/icommunity/ICommunityServiceImpl', () => ({
  icommunityService: {
    createEvidence: mockCreateEvidence,
    getEvidence: vi.fn(),
  },
}));

// Import mocked module so we can use vi.mocked() in tests
import { statusTypeRepository } from '@/infrastructure/prisma/repositories/StatusTypeRepositoryPrisma';

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
    // Re-apply default implementations that clearAllMocks may wipe
    vi.mocked(statusTypeRepository.getById).mockResolvedValue(fakeStatusType);
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

  it('3. adds a state to the product with the fake status type', async () => {
    // Setup: create the product
    const { POST: createProduct } = await import('@/app/api/v1/products/route');
    await createProduct(makeRequest('POST', '/products', {
      id: PRODUCT_ID,
      name: 'Panel Solar 300W',
      description: 'Panel solar de alta eficiencia',
    }));

    // Test: add a state
    const { POST: createState } = await import('@/app/api/v1/products/[id]/states/route');
    const response = await createState(
      makeRequest('POST', `/products/${PRODUCT_ID}/states`, {
        statusTypeId: STATUS_TYPE_ID,
        templateConfig: {
          inspector: 'Juan García',
          score: 95,
        },
      }),
      { params: Promise.resolve({ id: PRODUCT_ID }) }
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.itemId).toBe(PRODUCT_ID);
    expect(body.statusTypeId).toBe(STATUS_TYPE_ID);
    expect(body.title).toBe('Verificado');
    expect(body.templateConfig).toEqual({ inspector: 'Juan García', score: 95 });
    expect(body.id).toBeDefined();
    expect(body.createdAt).toBeDefined();

    // IBS must NOT have been called
    expect(mockCreateEvidence).not.toHaveBeenCalled();

    // Filesystem state file must exist
    expect(existsSync(join(SANDBOX_DIR, 'states.json'))).toBe(true);
  });

  it('4. full flow: create → retrieve → add state → verify state persisted', async () => {
    const { POST: createProduct, GET: listProducts } = await import('@/app/api/v1/products/route');
    const { GET: getProduct } = await import('@/app/api/v1/products/[id]/route');
    const { POST: createState } = await import('@/app/api/v1/products/[id]/states/route');
    const { itemRepositoryFilesystem } = await import(
      '@/infrastructure/filesystem/repositories/ItemRepositoryFilesystem'
    );
    const { stateRepositoryFilesystem } = await import(
      '@/infrastructure/filesystem/repositories/StateRepositoryFilesystem'
    );

    // Step 1: create product
    const createRes = await createProduct(makeRequest('POST', '/products', {
      id: PRODUCT_ID,
      name: 'Panel Solar 300W',
      description: 'Panel solar de alta eficiencia',
    }));
    expect(createRes.status).toBe(201);

    // Step 2: retrieve product
    const getRes = await getProduct(
      makeRequest('GET', `/products/${PRODUCT_ID}`),
      { params: Promise.resolve({ id: PRODUCT_ID }) }
    );
    expect(getRes.status).toBe(200);
    const productBody = await getRes.json();
    expect(productBody.name).toBe('Panel Solar 300W');

    // Verify it's in the filesystem repo directly
    const storedProduct = await itemRepositoryFilesystem.getById(PRODUCT_ID, ORG_ID);
    expect(storedProduct).not.toBeNull();
    expect(storedProduct!.name).toBe('Panel Solar 300W');

    // Step 3: add a state
    const stateRes = await createState(
      makeRequest('POST', `/products/${PRODUCT_ID}/states`, {
        statusTypeId: STATUS_TYPE_ID,
        templateConfig: { inspector: 'María López', score: 88 },
      }),
      { params: Promise.resolve({ id: PRODUCT_ID }) }
    );
    expect(stateRes.status).toBe(201);
    const stateBody = await stateRes.json();

    // Step 4: verify the state is in the filesystem repo
    const storedStates = await stateRepositoryFilesystem.listByItem(PRODUCT_ID, ORG_ID);
    expect(storedStates).toHaveLength(1);
    expect(storedStates[0].id).toBe(stateBody.id);
    expect(storedStates[0].statusType.name).toBe('Verificado');
    expect(storedStates[0].templateConfig).toEqual({ inspector: 'María López', score: 88 });

    // List products also works in sandbox
    const listRes = await listProducts(makeRequest('GET', '/products'));
    const listBody = await listRes.json();
    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0].id).toBe(PRODUCT_ID);

    // IBS must NOT have been called at any point
    expect(mockCreateEvidence).not.toHaveBeenCalled();
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

  it('returns 404 when adding a state with an unknown status type', async () => {
    const { POST: createProduct } = await import('@/app/api/v1/products/route');
    const { POST: createState } = await import('@/app/api/v1/products/[id]/states/route');
    const { StatusTypeNotFoundError } = await import('@/domain/status-types/errors');

    await createProduct(makeRequest('POST', '/products', {
      id: PRODUCT_ID,
      name: 'Panel Solar 300W',
      description: 'Desc',
    }));

    // Override mock to simulate missing status type
    vi.mocked(statusTypeRepository.getById).mockRejectedValueOnce(
      new StatusTypeNotFoundError('unknown-st', 'Not found')
    );

    const response = await createState(
      makeRequest('POST', `/products/${PRODUCT_ID}/states`, {
        statusTypeId: 'unknown-st',
        templateConfig: {},
      }),
      { params: Promise.resolve({ id: PRODUCT_ID }) }
    );

    expect(response.status).toBe(404);
  });
});
