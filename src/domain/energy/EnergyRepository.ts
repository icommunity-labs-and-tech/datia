import type { Scope } from '@/lib/scope';
import type { CursorPaginationParams, CursorPaginationResult } from '@/lib/api/cursor-pagination';
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

export interface EnergyRepository {
  // Energy Sources — filtered by org via assetId → Item.organizationId
  createSource(scope: Scope, input: CreateEnergySourceInput): Promise<EnergySourceRecord>;
  findSourcesByOrganization(scope: Scope, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergySourceRecord>>;
  findSourceById(scope: Scope, id: string): Promise<EnergySourceRecord | null>;

  // Energy Consumption — filtered by org via energySourceId → EnergySource → Item
  createConsumption(scope: Scope, input: CreateEnergyConsumptionInput): Promise<EnergyConsumptionRecord>;
  findConsumptionByOrganization(scope: Scope, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EnergyConsumptionRecord>>;
  getConsumptionTotals(scope: Scope): Promise<EnergyConsumptionTotals>;
  getEmissionTotals(scope: Scope): Promise<EmissionTotals>;
  findConsumptionById(scope: Scope, id: string): Promise<EnergyConsumptionRecord | null>;

  // Emission Records — filtered by org via energyConsumptionId → … → Item
  createEmission(scope: Scope, input: CreateEmissionRecordInput): Promise<EmissionRecord>;
  findEmissionsByOrganization(scope: Scope, limit?: number, pagination?: CursorPaginationParams): Promise<CursorPaginationResult<EmissionRecord>>;
  findEmissionById(scope: Scope, id: string): Promise<EmissionRecord | null>;
}
