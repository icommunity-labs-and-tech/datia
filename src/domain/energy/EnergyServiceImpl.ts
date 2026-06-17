import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import type { EnergyRepository } from './EnergyRepository';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  CreateEnergySourceInput,
  CreateEnergyConsumptionInput,
  CreateEmissionRecordInput,
} from './EnergyTypes';
import { EnergyValidationError } from './EnergyTypes';

export interface EnergyService {
  createSource(organizationId: string, input: CreateEnergySourceInput): Promise<EnergySourceRecord>;
  listSources(organizationId: string, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergySourceRecord>>;
  createConsumption(organizationId: string, input: CreateEnergyConsumptionInput): Promise<EnergyConsumptionRecord>;
  listConsumption(organizationId: string, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergyConsumptionRecord>>;
  createEmission(organizationId: string, input: CreateEmissionRecordInput): Promise<EmissionRecord>;
  listEmissions(organizationId: string, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EmissionRecord>>;
}

export function createEnergyServiceImpl({ energyRepository }: { energyRepository: EnergyRepository }): EnergyService {
  return {
    async createSource(organizationId, input) {
      if (!input.name.trim()) throw new EnergyValidationError('Source name is required');
      if (input.renewableShare != null && (input.renewableShare < 0 || input.renewableShare > 100)) {
        throw new EnergyValidationError('renewableShare must be between 0 and 100');
      }
      return energyRepository.createSource(organizationId, input);
    },

    async listSources(organizationId, pagination) {
      return energyRepository.findSourcesByOrganization(organizationId, 20, pagination);
    },

    async createConsumption(organizationId, input) {
      if (input.consumptionKwh <= 0) throw new EnergyValidationError('consumptionKwh must be positive');
      if (input.periodEnd <= input.periodStart) throw new EnergyValidationError('periodEnd must be after periodStart');
      // Auto-derive MJ if not provided
      const consumptionMj = input.consumptionMj ?? input.consumptionKwh * 3.6;
      return energyRepository.createConsumption(organizationId, { ...input, consumptionMj });
    },

    async listConsumption(organizationId, pagination) {
      return energyRepository.findConsumptionByOrganization(organizationId, 20, pagination);
    },

    async createEmission(organizationId, input) {
      if (input.co2eKg < 0) throw new EnergyValidationError('co2eKg cannot be negative');
      return energyRepository.createEmission(organizationId, input);
    },

    async listEmissions(organizationId, pagination) {
      return energyRepository.findEmissionsByOrganization(organizationId, 20, pagination);
    },
  };
}
