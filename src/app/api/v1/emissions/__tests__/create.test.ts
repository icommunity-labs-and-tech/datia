import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const ORG_ID = 'org-test-1';
const CONSUMPTION_ID = 'consumption-test-1';
const EMISSION_ID = 'emission-test-1';
const EVIDENCE_ID = 'evd_test1';

const {
  mockValidateApiToken,
  mockValidateConsumptionOwnership,
  mockCreateEmission,
  mockAnchorEmissionById,
  mockEventCreate,
} = vi.hoisted(() => ({
  mockValidateApiToken: vi.fn(),
  mockValidateConsumptionOwnership: vi.fn(),
  mockCreateEmission: vi.fn(),
  mockAnchorEmissionById: vi.fn(),
  mockEventCreate: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/auth/api-tokens/middleware', () => ({ validateApiToken: mockValidateApiToken }));
vi.mock('../../energy/_validate', () => ({
  validateConsumptionOwnership: mockValidateConsumptionOwnership,
}));
vi.mock('@/domain/energy/EnergyServiceImpl', () => ({
  createEnergyServiceImpl: () => ({ createEmission: mockCreateEmission }),
}));
vi.mock('@/infrastructure/prisma/repositories/EnergyRepositoryPrisma', () => ({
  energyRepository: {},
}));
vi.mock('@/infrastructure/prisma/repositories/EventRepositoryPrisma', () => ({
  eventRepository: { create: mockEventCreate },
}));
vi.mock('@/lib/energy/anchor-service', () => ({
  anchorEmissionById: mockAnchorEmissionById,
}));

import * as route from '../route';

const validBody = {
  energyConsumptionId: CONSUMPTION_ID,
  co2eKg: 16.91,
  scope: 'SCOPE_3',
  systemBoundary: 'CRADLE_TO_GRAVE',
  emissionFactor: 0.041,
  emissionFactorSource: 'IPCC AR6',
  calculationMethodology: 'ISO 14067',
};

const post = (body: unknown = validBody) =>
  (route as any).POST(
    new NextRequest('http://localhost/api/v1/emissions', {
      method: 'POST',
      body: JSON.stringify(body),
    } as any)
  );

const record = { id: EMISSION_ID, ...validBody, energyConsumptionId: CONSUMPTION_ID };

describe('POST /api/v1/emissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID, isSandbox: false });
    mockValidateConsumptionOwnership.mockResolvedValue({ id: CONSUMPTION_ID });
    mockCreateEmission.mockResolvedValue(record);
    mockAnchorEmissionById.mockResolvedValue({
      emissionId: EMISSION_ID,
      period: '2026-03-14',
      co2eKg: 16.91,
      evidenceID: EVIDENCE_ID,
    });
    mockEventCreate.mockResolvedValue({});
  });

  describe('access', () => {
    it('rejects a request with no valid token', async () => {
      mockValidateApiToken.mockResolvedValue(null);
      const res = await post();
      expect(res.status).toBe(401);
      expect(mockCreateEmission).not.toHaveBeenCalled();
    });

    it('refuses the energy module in sandbox', async () => {
      mockValidateApiToken.mockResolvedValue({ organizationId: ORG_ID, isSandbox: true });
      expect((await post()).status).toBe(422);
    });

    it('rejects a body that does not validate', async () => {
      const res = await post({ energyConsumptionId: CONSUMPTION_ID, co2eKg: -5 });
      expect(res.status).toBe(400);
      expect(mockCreateEmission).not.toHaveBeenCalled();
    });

    it('rejects a consumption of another organisation', async () => {
      mockValidateConsumptionOwnership.mockResolvedValue(null);
      expect((await post()).status).toBe(404);
    });
  });

  describe('certification', () => {
    it('anchors the record as it is written, without a second request', async () => {
      const res = await post();
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(mockAnchorEmissionById).toHaveBeenCalledWith(ORG_ID, EMISSION_ID);
      expect(json.certification).toEqual({
        status: 'pending_anchor',
        evidenceId: EVIDENCE_ID,
      });
    });

    it('anchors after storing, never before', async () => {
      const order: string[] = [];
      mockCreateEmission.mockImplementation(async () => {
        order.push('store');
        return record;
      });
      mockAnchorEmissionById.mockImplementation(async () => {
        order.push('anchor');
        return { emissionId: EMISSION_ID, period: '2026-03-14', co2eKg: 16.91, evidenceID: EVIDENCE_ID };
      });

      await post();
      expect(order).toEqual(['store', 'anchor']);
    });

    it('stores the reading even when anchoring fails', async () => {
      // iBS being unreachable must not stop a client's meter from writing: a
      // proof that arrives late is a far smaller failure than a lost reading.
      mockAnchorEmissionById.mockResolvedValue({
        emissionId: EMISSION_ID,
        period: '2026-03-14',
        co2eKg: 16.91,
        error: 'iBS unreachable',
      });

      const res = await post();
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.id).toBe(EMISSION_ID);
      expect(json.certification).toEqual({ status: 'pending', reason: 'iBS unreachable' });
    });

    it('stores the reading when the organisation cannot sign yet', async () => {
      // No verified identity: nothing to sign the evidence with, so the record
      // stays pending rather than claiming a certification it does not have.
      mockAnchorEmissionById.mockResolvedValue(null);

      const res = await post();
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.certification).toEqual({ status: 'pending', reason: 'not_anchored_yet' });
    });

    it('reports the emission as an event whatever the anchoring does', async () => {
      mockAnchorEmissionById.mockResolvedValue(null);
      await post();

      expect(mockEventCreate).toHaveBeenCalledWith(
        ORG_ID,
        expect.objectContaining({ eventType: 'co2_emission_event', entityId: EMISSION_ID })
      );
    });
  });
});
