import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
import type { EnergyRepository } from './EnergyRepository';
import type {
  EnergySourceRecord,
  EnergyConsumptionRecord,
  EmissionRecord,
  CreateEnergySourceInput,
  CreateEnergyConsumptionInput,
  CreateEmissionRecordInput,
  EnergyConsumptionTotals,
  EmissionTotals,
} from './EnergyTypes';
import { EnergyValidationError } from './EnergyTypes';
import type { Scope } from '@/lib/scope';

export interface EnergyService {
  createSource(scope: Scope, input: CreateEnergySourceInput): Promise<EnergySourceRecord>;
  listSources(scope: Scope, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergySourceRecord>>;
  createConsumption(scope: Scope, input: CreateEnergyConsumptionInput): Promise<EnergyConsumptionRecord>;
  listConsumption(scope: Scope, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergyConsumptionRecord>>;
  getConsumptionTotals(scope: Scope): Promise<EnergyConsumptionTotals>;
  getEmissionTotals(scope: Scope): Promise<EmissionTotals>;
  createEmission(scope: Scope, input: CreateEmissionRecordInput): Promise<EmissionRecord>;
  listEmissions(scope: Scope, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EmissionRecord>>;
}

export function createEnergyServiceImpl({ energyRepository }: { energyRepository: EnergyRepository }): EnergyService {
  return {
    async createSource(scope, input) {
      if (!input.name.trim()) throw new EnergyValidationError('Source name is required');
      if (input.renewableShare != null && (input.renewableShare < 0 || input.renewableShare > 100)) {
        throw new EnergyValidationError('renewableShare must be between 0 and 100');
      }
      return energyRepository.createSource(scope, input);
    },

    async listSources(scope, pagination) {
      return energyRepository.findSourcesByOrganization(scope, 20, pagination);
    },

    async createConsumption(scope, input) {
      if (input.consumptionKwh <= 0) throw new EnergyValidationError('consumptionKwh must be positive');
      if (input.periodEnd <= input.periodStart) throw new EnergyValidationError('periodEnd must be after periodStart');
      // Auto-derive MJ if not provided
      const consumptionMj = input.consumptionMj ?? input.consumptionKwh * 3.6;
      return energyRepository.createConsumption(scope, { ...input, consumptionMj });
    },

    async listConsumption(scope, pagination) {
      return energyRepository.findConsumptionByOrganization(scope, 20, pagination);
    },

    async getConsumptionTotals(scope) {
      return energyRepository.getConsumptionTotals(scope);
    },

    async getEmissionTotals(scope) {
      return energyRepository.getEmissionTotals(scope);
    },

    async createEmission(scope, input) {
      if (input.co2eKg < 0) throw new EnergyValidationError('co2eKg cannot be negative');
      return energyRepository.createEmission(scope, input);
    },

    async listEmissions(scope, pagination) {
      return energyRepository.findEmissionsByOrganization(scope, 20, pagination);
    },
  };
}
